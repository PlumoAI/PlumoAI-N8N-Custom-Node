import type {
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	IWebhookFunctions,
	IHookFunctions
} from 'n8n-workflow';
import {  NodeOperationError,NodeConnectionTypes } from 'n8n-workflow';

export class PlumoAITrigger implements INodeType {
	description: INodeTypeDescription = {
		credentials: [
			{
				name: 'plumoAIAPI',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiToken' ],
					},
				},
			},
		],
		displayName: 'PlumoAI Trigger',
		defaults: {
			name: 'PlumoAI Trigger',
		},
		description: 'Starts the workflow when PlumoAI events occur',
		group: ['trigger'],
		icon: "file:../../icons/plumoai.png",
		inputs: [],		// keep sendinblue name for backward compatibility
		name: 'plumoAITrigger',
		version: 1,
		outputs: [NodeConnectionTypes.Main],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				path: 'plumoAi',
			},
		],
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
				displayName: 'Trigger On',
				name: 'event',
				type: 'options',
				options: [
				
					{
						name: 'Record Added',
						value: 'vt_rc',
						action: 'Record Added',
						description: 'This will trigger the node when a record is added.',
						
					},
					{
						name: 'Record Updated',
						value: 'vt_ru',
						action: 'Record Updated',
						description: 'This will trigger the node when a record is updated.',
					},
					{
						name: 'Record Added or Updated',
						value: 'vt_rmc',
						action: 'Record Added or Updated',
						description: 'This will trigger the node when a record is added or updated.',
						
					}
				],
				default: [],
			},			
			{
				displayName: 'Project',
				name: 'project',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				displayOptions: {
					hide: {
						event: ["*"],
					},
				},
				default: '',
				description: 'Select a project from the API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},			
			{
				displayName: 'Table',
				name: 'table',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getProjectTables',
					loadOptionsDependsOn: ['project'], // ✅ ensures reload when project changes
				},
				displayOptions: {
					hide: {
						project: ["*"],
					},					
				},
				default: '',
				description: 'Select a table from the API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			}

		],
		
	};
	methods = {
		loadOptions: {
			async getProjects(this: ILoadOptionsFunctions) {
				try{
				const credentials = await this.getCredentials('plumoAiApi');
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
								"p_Location_fid":-1,
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
			async getProjectTables(this: ILoadOptionsFunctions) {
				
				const credentials = await this.getCredentials('plumoAiApi');
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
							"storeProcedureName":"usp_proj_get_projectworkflow",
							"parameters":{	
								"p_project_id":this.getNodeParameter('project',0),
							}
						},
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
						'companyid':JSON.stringify(verifyResponse.data.companyIds)
					},
				});
				return response.data.map((table: any) => ({
					name: table.workitem_type,
					value: table.proj_workitem_type_fid,
				}));
			
			}
			
		},
	};
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				
				const {credentials,verifyResponse } = await getCredentialsAndVerify.call(this);		
				if(!verifyResponse.data || !credentials.accessToken){
					throw new NodeOperationError(this.getNode(), "Invalid Credentials");
				}

				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				var triggers = await this.helpers.httpRequest({
					method: 'POST',
					url: 'https://api.plumoai.com/Auth/store/procedure/execute',
					body: {
						"storeProcedureName":"usp_proj_def_automation_when_get",
						"parameters":{}
					},
					headers: {
						'Authorization': "Bearer "+credentials.accessToken
					},
				});
				var actions = await this.helpers.httpRequest({
					method: 'POST',
					url: 'https://api.plumoai.com/Auth/store/procedure/execute',
					body: {
						"storeProcedureName":"usp_proj_def_automation_then_get",
						"parameters":{}
					},
					headers: {
						'Authorization': "Bearer "+credentials.accessToken
					},
				});

				var selectedTrigger = triggers.data.find((trigger: any) => trigger.when_type_code === this.getNodeParameter('event',0));
				var selectedAction = actions.data.find((action: any) => action.then_type_code === "n8n_wk");

				var workflowAutomation = {
					"automation":{
						"automation_id":webhookData.automation_id??"0",
						"automation_name":`N8N Automation - ${this.getNode().name}`,
						"automation_on":1,
						"project_id":this.getNodeParameter('project',0),
						"modified_by":verifyResponse.data.userId,
						"whens":[
							{"automation_fid":webhookData.automation_id??"0","automation_when_id":"0","when_type_fid":selectedTrigger.when_type_id,"action":"i","is_active":1,"modified_by":verifyResponse.data.userId,"isOpen":false,"proj_workitem_type_fid":this.getNodeParameter('table',0),"conditions":[]}
						],
						"thens":[
							{"automation_fid":webhookData.automation_id??"0","automation_then_id":"0","project_id":this.getNodeParameter('project',0),"proj_workitem_type_fid":this.getNodeParameter('table',0),"then_seq_no":0,"then_type_fid":selectedAction.then_type_id,"is_active":1,"action":"i","modified_by":verifyResponse.data.userId,"then_action":{"n8n_url":webhookUrl,"n8n_method":"POST","n8n_body":{}}}
						]						
					},"companyId":verifyResponse.data.companyIds[0]
				};

				var response = await this.helpers.httpRequest({
					method: 'POST',
					url: 'https://api.plumoai.com/company/automation/save',
					body: workflowAutomation,
					headers: {
						'Authorization': "Bearer "+credentials.accessToken
					},
				});
				webhookData.automation_id = response.data[0].p_automation_id;


				
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				
				if(webhookData.automation_id){
					const {credentials,verifyResponse } = await getCredentialsAndVerify.call(this);		
					if(!verifyResponse.data || !credentials.accessToken){
						throw new NodeOperationError(this.getNode(), "Invalid Credentials");
					}
					await this.helpers.httpRequest({
						method: 'POST',
						url: 'https://api.plumoai.com/company/store/procedure/execute',
						body: {
								"storeProcedureName":"usp_proj_delete_automation",
								"parameters":{	
									"p_automation_id":webhookData.automation_id
								}
							},
						headers: {
							'Authorization': "Bearer "+credentials.accessToken,
							'companyid':JSON.stringify(verifyResponse.data.companyIds)
						},
					});
					
					delete webhookData.automation_id;
					return true;
				}
				return true;

			}
			
		},
	};
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
	
		var data = JSON.parse(this.getBodyData() as unknown as string);
		 
		if(data.length > 0){
			var record = data[0].find((x:any) => x);
			var recordCustomFields = data[1];
			var completeRecord = {
				...record
			} as any;
			for(var customField of recordCustomFields){
				completeRecord[customField.field_name] = customField.field_value??customField.field_value_text??customField.field_json_value;
			}
			return {
				workflowData: [
					this.helpers.returnJsonArray(
						[completeRecord]
					)
				],
			}
		}
		
		return {
			workflowData: [
				this.helpers.returnJsonArray(JSON.parse(this.getBodyData() as unknown as string)),
			],
			
			
		}
	}
	

	
}
async function getCredentialsAndVerify (this: IHookFunctions) {
	const credentials = await this.getCredentials('plumoAiApi');
	const verifyResponse = await this.helpers.httpRequest({
		method: 'GET',
		url: 'https://api.plumoai.com/Auth/oauth/me',
		headers: {
			'Authorization': "Bearer "+credentials.accessToken,
		},
	});
	return { credentials, verifyResponse };
}	
