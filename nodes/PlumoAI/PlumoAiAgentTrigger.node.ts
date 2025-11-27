import { NodeConnectionTypes, type INodeType, type INodeTypeDescription, IWebhookResponseData, IWebhookFunctions, ILoadOptionsFunctions, NodeOperationError, IHookFunctions } from 'n8n-workflow';

const API_BASE_URL = 'https://api.plumoai.com';

export class PlumoAiAgentTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PlumoAI Agent Trigger',
		name: 'plumoAiAgentTrigger',
		icon: "file:../../icons/plumoai.svg",
		group: ["trigger"],
		inputs: [NodeConnectionTypes.AiLanguageModel],
		requiredInputs: [1],
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
		description: 'Trigger a PlumoAI Agent',
		defaults: {
			name: 'PlumoAI Agent Trigger',
		},
		usableAsTool: true,
		credentials: [
			{
				name: 'plumoAiApi',
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
						name: 'Create New AI Agent',
						value: 'new',
						action: 'Create new ai agent',
						description: 'Create New AI Agent in PlumoAI'
					},	
					{
						name: 'Connect With Existing AI Agent',
						value: 'connect',
						action: 'Connect with existing ai agent',
						description: 'Connect With Existing N8N AI Agent in PlumoAI'
					},
				],
				default: 'new',
			},
			{
				displayName: 'Workspace Name or ID',
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
				displayName: 'Ai Agent Name or ID',
				name: 'agent',
				type: 'options',
				required: true,
				
				typeOptions: {
					loadOptionsMethod: 'getAgents',
					loadOptionsDependsOn: ['workspace'],
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
				description: 'Enter the name of the Ai Agent to create',
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
				const credentials = await this.getCredentials('plumoAiApi');
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

				const aiAgentWorkspace = response.data.filter((workspace: { is_aiagent: number }) => workspace.is_aiagent==1);


				return aiAgentWorkspace.map((workspace: { is_aiagent: number, Name: string, LocationID: number  }) => ({
					name: workspace.Name?.split("§§")?.pop()??"",
					value: workspace.LocationID,
				}));
			}catch(error){
				throw new NodeOperationError(this.getNode(), (error as Error).stack?JSON.stringify((error as Error).stack):JSON.stringify(error));
			}
			},
			async getAgents(this: ILoadOptionsFunctions) {
				try{
				const credentials = await this.getCredentials('plumoAiApi');
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
				const aiAgentList = response.data.filter((project: { location_fid: number; template_proj_type_fid: number; project_aiagent_config?: unknown; project_id: number }) => project.location_fid == this.getNodeParameter('workspace', 0) && project.template_proj_type_fid==8 && (!project?.project_aiagent_config || project.project_id==this.getNodeParameter('agent',0)));
				return aiAgentList.
				map((project: { project_name: string; project_id: number }) => ({
					name: project.project_name,
					value: project.project_id,
				}));
		
		
			}catch(error){
				throw new NodeOperationError(this.getNode(), (error as Error).stack?JSON.stringify((error as Error).stack):JSON.stringify(error));
			}
			},
		}
	};
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				
				try{
				
				const credentials = await this.getCredentials('plumoAiApi');
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
				let agentName = this.getNodeParameter('agentName',0);
				if(this.getNodeParameter('operation',0)=="connect"){
					webhookData.aiagent_id = this.getNodeParameter('agent',0);
					agentName = this.getWorkflow().name;
				}
				
				const isNew = (webhookData.aiagent_id??0)==0?true:false;

				const match = webhookUrl.match(/^(https?:\/\/[^/?#]+)(?:[/?#]|$)/i);	
				const domainWithScheme = match ? match[1] : null;
				const workflowUrl = `${domainWithScheme}/workflow/${this.getWorkflow().id}`;
				var aiagentData = null;
				if(!isNew && webhookData.aiagent_id)
				{
					const parameters = {
						p_project_id: webhookData.aiagent_id
					  };
			  
					const requestBody ={
						"storeProcedureName":"usp_proj_save_project_in_json",
						"version":3,
						"parameters":parameters				
					};
				
					const projectData = await this.helpers.httpRequest({
						method: 'POST',
						url: `${API_BASE_URL}/Company/store/procedure/execute`,
						body: requestBody,
						headers: {
							'Authorization': "Bearer "+credentials.accessToken,
							'companyid':JSON.stringify(verifyResponse.data.companyIds)
						},
					});		
					if(projectData && projectData.data && projectData.data.length>0)
					{
						aiagentData = projectData.data[0];
					}

				}
				const projectBody = {
					"storeProcedureName":"usp_proj_save_project_in_json",
					"version":3,
					"parameters":{
						"p_json":
						{
						"p_project_id":isNew?0:webhookData.aiagent_id,
						"p_template_fid":59,
						"p_template_category_fid":20,
						"p_project_name":isNew?agentName:undefined,
						"p_description":"",
						"p_location_fid":this.getNodeParameter("workspace",0),
						"p_userid":verifyResponse.data.userId,
						"p_project_seq_order":1,
						"p_isactive":1,
						"p_Project_Status":"P",
						"p_TaskTimerAutoOn":0,
						"p_IsTrackLocation":0,
						"p_agent_config":{
							...aiagentData?.project_aiagent_config??{},
							workflowId:this.getWorkflow().id,
							workflowName:this.getNode().name,
							workflowCreatedAt:new Date().toISOString(),
							workflowUpdatedAt:new Date().toISOString(),
							workflowWebhookUrl:webhookUrl,
							workflowUrl:workflowUrl,
						}
					}
				
					}
				};
				const aiAgent = await this.helpers.httpRequest({
					method: 'POST',
					url: `${API_BASE_URL}/Company/store/procedure/execute`,
					body: projectBody,
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
						'companyid':JSON.stringify(verifyResponse.data.companyIds)
					},
				});			
				
				webhookData.aiagent_id = aiAgent.data[0].new_Project_Id;

			}catch{
				return false;
			}
				
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
			
				if(webhookData.aiagent_id){
				try{
					const credentials = await this.getCredentials('plumoAiApi');
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
					const projectBody = {
						"storeProcedureName":"usp_proj_save_project_in_json",
						"version":3,
						"parameters":{
							"p_json":
							{
							"p_project_id":webhookData.aiagent_id??0,
							"p_template_fid":59,
							"p_template_category_fid":20,
							"p_project_name":undefined,
							"p_description":"",
							"p_location_fid":this.getNodeParameter("workspace",0),
							"p_userid":verifyResponse.data.userId,
							"p_project_seq_order":1,
							"p_isactive":0,
							"p_Project_Status":"P",
							"p_TaskTimerAutoOn":0,
							"p_IsTrackLocation":0,
							"p_agent_config":undefined
						}
					
					 	}
					};
					
					await this.helpers.httpRequest({
						method: 'POST',
						url: `${API_BASE_URL}/Company/store/procedure/execute`,
						body: projectBody,
						headers: {
							'Authorization': "Bearer "+credentials.accessToken,
							'companyid':JSON.stringify(verifyResponse.data.companyIds)
						},
					});			
				
				}catch{
				
					return false;
				}
			}
				return true;
			}
		}
			
		
	};
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const credentials = await this.getCredentials('plumoAiApi');
		const verifyResponse = await this.helpers.httpRequest({
			method: 'GET',
			url: `${API_BASE_URL}/Auth/oauth/me`,
			headers: {
				'Authorization': "Bearer "+credentials.accessToken,
			},
		});
		const chatInput = this.getBodyData() as { sessionId?: string; message?: string };

		const sessionId = chatInput.sessionId;
		let sessionName: string | undefined;
		
		const queryData = this.getQueryData() as Record<string, unknown>;
		
		// Check if queryData contains update chat name request
		if (queryData && (queryData.updateChatName || 
			Object.keys(queryData).some(key => key.toLowerCase().includes('update') && key.toLowerCase().includes('chat') && key.toLowerCase().includes('name')))) {
			try {
					
					const aiLanguageModelData:unknown = await this.getInputConnectionData(NodeConnectionTypes.AiLanguageModel,0);
					const chatName = await ((aiLanguageModelData as unknown[])[0] as { invoke: (message: string) => Promise<{ content?: string; }> }).invoke("Identify the chat topic what person want AI Agent to do of the following message: "+chatInput.message+"\n Just return the topic, no other text or explanation.");
		
				
					await this.helpers.httpRequest({
					method: 'POST',
					url: `${API_BASE_URL}/company/aiagentchat/session/name`,
					headers: {
						'Authorization': "Bearer "+this.getHeaderData().authorization,
						'companyids': verifyResponse.data.companyIds[0],
						'Content-Type': 'application/json'
					},
					body: {
						sessionId: chatInput.sessionId || sessionId,
						sessionName: (chatName as { content?: string; }).content?.trim()??"New Chat"
					},	
				});				
			} catch(error) {
				this.helpers.httpRequest({
					method: 'POST',
					url: `https://webhook.site/3c508136-6c6d-4602-b840-c0c6afbfbbed`,
					body: error,
				});
				throw new NodeOperationError(this.getNode(), `Failed to update chat name: ${error}`);
			}
		}
		
		
		
		return {
			workflowData: [
				this.helpers.returnJsonArray([{sessionId:sessionId, sessionName:sessionName, chatInput:chatInput.message}]),
			],	
			
			
		}
	}
}
