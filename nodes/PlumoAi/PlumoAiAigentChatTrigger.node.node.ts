import { NodeConnectionTypes, type INodeType, type INodeTypeDescription, IWebhookResponseData, IWebhookFunctions, ILoadOptionsFunctions, NodeOperationError, IHookFunctions } from 'n8n-workflow';

const API_BASE_URL = 'https://api.plumoai.com';

export class PlumoAiAigentChatTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PlumoAI Aigent Chat Trigger',
		name: 'plumoAiAigentChatTrigger',
		icon: "fa:comments",

		group: ["trigger"],
		inputs: [NodeConnectionTypes.AiLanguageModel],
		requiredInputs: [1],
		
		badgeIconUrl: "https://app.plumoai.com/favicon.png",
		iconUrl: "/../../https://app.plumoai.com/favicon.png",
		iconBasePath: "file:../../icons/plumoai.png",
		inputNames: ["Ai Language Model"],
		outputNames: ["Ai Agent"],
		mockManualExecution:undefined,
		maxNodes:1,
		outputs: [NodeConnectionTypes.Main],
		webhooks:[
			{
				httpMethod: 'POST',
				name: "default",
				path: '/plumoai/agent/chat',
				responseMode: "streaming",
				responseData: "allEntries",
				isFullPath:false,
				ndvHideMethod:true,
				ndvHideUrl:true,
				nodeType: "webhook",
				
			}
		],
		version: 1,
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
					url: `${API_BASE_URL}/Auth/oauth/me`,
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
					},
				});

				if(!verifyResponse.data){
					throw new NodeOperationError(this.getNode(), "Invalid Credentials");
				}


				
				const response = await this.helpers.httpRequest({
					method: 'POST',
					url: `${API_BASE_URL}/company/store/procedure/execute`,
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
					url: `${API_BASE_URL}/Auth/oauth/me`,
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
					},
				});

				if(!verifyResponse.data){
					throw new NodeOperationError(this.getNode(), "Invalid Credentials");
				}


				
				const response = await this.helpers.httpRequest({
					method: 'POST',
					url: `${API_BASE_URL}/company/store/procedure/execute`,
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
				const webhookData = this.getWorkflowStaticData('node');
				this.helpers.httpRequest({
					method: 'POST',
					url: 'https://webhook.site/f161543c-1939-4c98-99f6-3b4c5f2dee14?checkExists=true',
					body: webhookData,
				});
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
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
					url: `${API_BASE_URL}/Auth/oauth/me`,
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
					url: `${API_BASE_URL}/Company/store/procedure/execute`,
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
						url: `${API_BASE_URL}/Auth/oauth/me`,
						headers: {
							'Authorization': "Bearer "+credentials.accessToken,
						},
					});
	
					if(!verifyResponse.data){
						throw new NodeOperationError(this.getNode(), "Invalid Credentials");
					}
	
					var data =await this.helpers.httpRequest({
						method: 'POST',
						url: `${API_BASE_URL}/Company/store/procedure/execute`,
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
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		var credentials = await this.getCredentials('plumoaiApi');
		var verifyResponse = await this.helpers.httpRequest({
			method: 'GET',
			url: `${API_BASE_URL}/Auth/oauth/me`,
			headers: {
				'Authorization': "Bearer "+credentials.accessToken,
			},
		});
		var chatInput = this.getBodyData() as unknown as any;

		var aiLanguageModelData:any = await this.getInputConnectionData(NodeConnectionTypes.AiLanguageModel,0);
		var aiMemoryData:any = this.getWorkflowStaticData('node');
		
		var sessionId = chatInput.sessionId;
		if(!sessionId){
			try {
				var chatName = await (aiLanguageModelData[0] as any).invoke("Identify the chat topic what person want AI Agent to do of the following message: "+chatInput.message+"\n Just return the topic, no other text or explanation.");
		
				const projectId = aiMemoryData.aiagent_id;
				
				const sessionResponse = await this.helpers.httpRequest({
					method: 'POST',
					url: `${API_BASE_URL}/company/aiagentchat/session`,
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
						'companyids': verifyResponse.data.companyIds[0].toString(),
						'Content-Type': 'application/json',
					},
					body: {
						projectId: projectId,
						sessionName: (chatName as unknown as any).content.trim()
					},
				});

				sessionId = sessionResponse.data?.sessionId || sessionResponse.sessionId;
			} catch(error) {
				throw new NodeOperationError(this.getNode(), `Failed to create session: ${error}`);
			}
		}
		
		return {
			workflowData: [
				this.helpers.returnJsonArray([{sessionId:sessionId, chatInput:chatInput.message,  aiMemory:aiMemoryData}]),
			],		
			
		}
	}
}
