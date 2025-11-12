import type {
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties
	// IWebhookResponseData,
	// IWebhookFunctions,
	// IHookFunctions
	
} from 'n8n-workflow';
import {  NodeOperationError,NodeConnectionTypes,ResourceMapperField } from 'n8n-workflow';
import FormData from 'form-data';


export const uploadAttachmentField: INodeProperties[] = [
	
	{
		displayName: 'Attachment',
		name: 'attachment',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: ["record"],
				operation: ["add"],
			},
		},	
		description:
			'Name of the binary property containing the file to upload. Usually `data` when coming from another node (e.g., HTTP Request).',
		placeholder: 'data',
		typeOptions: {
			binaryDataProperty:true,

		}
		
	},
];
export class PlumoAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PlumoAi',
		name: 'plumoAi',
		icon: "fa:hexagon-nodes",
		badgeIconUrl: 'https://app.plumoai.com/favicon.png',
		iconBasePath: 'file:../../icons/plumoai.png',	
		group: ["output"],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume PlumoAi API',
		defaults: {
			name: 'PlumoAi',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'plumoAiApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiToken' ],
					},
				},
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Table',
						value: 'table',
					},
					{
						name: 'Record',
						value: 'record',
					}
				],
				default: 'record',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['record'],
					},
				},
				options: [
					{
						name: 'Get All Records',
						value: 'get',						
						action: 'Get all records',
					},					
					{
						name: 'Add Record',
						value: 'add',						
						action: 'Add a record',
					},
					{
						name: 'Update Record',
						value: 'update',						
						action: 'Update a record',
					}
				],
				default: 'add',
			},	
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['table'],
					},
				},
				options: [
					{
						name: 'Get All Tables',
						value: 'get',						
						action: 'Get All Tables',
					}
				],
				default: 'get',
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
					show: {
						resource: ["record","table"]
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
					show: {
						resource: ["record"]
					},
				},
				default: '',
				description: 'Select a table from the API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Fetch Only Updated After',
				name: 'dataUpdatedAfter',
				type: 'dateTime',
				required: false,
				displayOptions: {
					hide: {
						project: ["*"],
					},	
					show: {
						resource: ["record"],
						operation: ["get"]
					},
				},
				default: '',
				description: 'Select a table from the API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getProjectTableStatus',
					loadOptionsDependsOn: ['project','table'], // ✅ ensures reload when project changes
				},
				displayOptions: {
					show: {
						resource: ["record"],
						operation: ["add"],
					},
				},
				default: '',
				description: 'Select a status from the API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Record Fields',
				name: 'recordFields',
				type: 'resourceMapper',
				displayOptions: {
					hide: {
						table: ["*"],
					},
					show: {
						resource: ["record"],
						operation: ["add"],
					},
				},
				
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				noDataExpression: true,
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['table'],
					resourceMapper: {
						resourceMapperMethod: 'getRecordFieldsMapper',
						mode: 'add',
						fieldWords: {
							singular: 'field',
							plural: 'fields',
						},
						addAllFields: true,
						multiKeyMatch: true,

					
					},
				},
			},
			...uploadAttachmentField,
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

				const response = await 
				getTables.call(this,credentials, verifyResponse);
				return response.data.map((table: any) => ({
					name: table.workitem_type,
					value: table.proj_workitem_type_fid,
				}));
			
			},
			async getProjectTableStatus(this: ILoadOptionsFunctions) {
				
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

				var selectedProjectTable = response.data.find((table: any) => table.proj_workitem_type_fid == this.getNodeParameter('table',0));

				if(!selectedProjectTable){
					return [];
				}
				const statusResponse = await this.helpers.httpRequest({
					method: 'POST',
					url: 'https://api.plumoai.com/company/store/procedure/execute',
					body: {
							"storeProcedureName":"usp_proj_get_workflow_status_transition",
							"parameters":{	
								"p_workflow_id":selectedProjectTable.proj_workflow_id,
								"p_project_fid":this.getNodeParameter('project',0),
								"p_proj_workitem_type_id":this.getNodeParameter('table',0)
							}
						},
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
						'companyid':JSON.stringify(verifyResponse.data.companyIds)
					},
				});
				
				return statusResponse.data.map((status: any) => ({
					name: status.status,
					value: status.proj_status_id,
				}));
			
			},
			async getRecordFields(this: ILoadOptionsFunctions) {
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

				var customFields = await getRecordFields.call(this, credentials.accessToken, verifyResponse.data.companyIds);
				var fields = customFields.map((field: any) => ({
					name: field.field_name,
					value: field.proj_field_id,
					data:field		
				}));
				
				return fields;
			}catch(error){
				return [{name:JSON.stringify(error),value:"Error Node"}];
			}
			

				
			}
		},
		resourceMapping: {			
			async getRecordFieldsMapper(this: ILoadOptionsFunctions) {
				
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
					body: {"storeProcedureName":"usp_proj_get_project_fields","version":2,
						"parameters":{"p_project_fid":this.getNodeParameter('project',0),"p_proj_workitem_type_fid":this.getNodeParameter('table',0)}},
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
						'companyid':JSON.stringify(verifyResponse.data.companyIds)
					},
				});

				const currentNodeData = this.getWorkflowStaticData('node');
				currentNodeData.recordFields = response.data[0];
				
				var titleSectionFields = response.data[0].filter((field: any)=>field.task_actual_fieldname == "title");
				var leftSectionFields = response.data[0].filter((field: any)=>field.field_tab_section == "left" &&  field.task_actual_fieldname != "title");
				var rightSectionFields = response.data[0].filter((field: any)=>field.field_tab_section == "right" && field.task_actual_fieldname != "title");
				const sprintResponse = await this.helpers.httpRequest({
					method: 'POST',
					url: 'https://api.plumoai.com/company/store/procedure/execute',
					body: {"storeProcedureName":"usp_proj_get_sprint","version":2,
						"parameters":{"p_project_id":this.getNodeParameter('project',0)}},
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
						'companyid':JSON.stringify(verifyResponse.data.companyIds)
					},
				});
				var fields =  [...titleSectionFields, ...leftSectionFields, ...rightSectionFields].map((field: any)=>{
					var fieldType ;
					var fieldOptions: any[] = [];
					// var typeOptions = {};

					if(field.type?.toLowerCase() == "text_singleLine" || field.type?.toLowerCase() == "text_multiLine"){
						fieldType = "string";						
					}
					else if(field.type?.toLowerCase() == "str_picklist"){
						fieldType = "options";

						if(field.task_actual_fieldname=="sprint_fid"){						
			

							fieldOptions = [...sprintResponse.data.map((sprint: any)=>{
								return {
									name: sprint.sprint_name,
									value: sprint.sprint_id
								};
							}),{name: "Backlog", value: 0}];
						}else{						
							fieldOptions =  
							field.field_value_list?.split(";").map((li: any)=>{
								return {
									name: JSON.stringify(li).split("��")[0].substring(1),
									value: JSON.stringify(li).split("��")[0].substring(1)						
								};
							});		
						}
					}
					else if(field.type?.toLowerCase() == "integer"){	
						fieldType = "number";						
					}
					else if(field.type?.toLowerCase() == "datetime"){
						fieldType = "dateTime";						
					}	
					else if(field.type?.toLowerCase() == "date"){
						fieldType = "dateTime";						
					}					

					return {
					"id": `${field.proj_field_id}`,
					"displayName": `${field.field_name}`,
					"required": field.is_required==1,
					"defaultMatch": false,
					"canBeUsedToMatch": true,
					"display": true,
					"type": fieldType,
					"readOnly": false,
					"removed": false,
					"options": fieldOptions??[],
					// "typeOptions": typeOptions,
				} as ResourceMapperField;
				})
				;
				return {fields: fields};
			}catch(error){
				
				return {fields: []};
			}
			
			},		
			
			
		},
	};
	

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
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
		const project = this.getNodeParameter('project',0);


		if(this.getNodeParameter('resource',0) == "table"){
			if(this.getNodeParameter('operation',0) == "get"){
				var tablesResponse = await getTables.call(this, credentials, verifyResponse);
				var tables = tablesResponse.data.map((table: any) => ({
					table_name: table.workitem_type,
					table_id: table.proj_workitem_type_fid,
				}))
				return [this.helpers.returnJsonArray([{tables}])];
			}		
			return [this.helpers.returnJsonArray([])];	
		}
		else if(this.getNodeParameter('resource',0) == "record"){
			
			const table = this.getNodeParameter('table',0);
			if(this.getNodeParameter('operation',0) == "get"){

				var recordsData = await this.helpers.httpRequest({
					method: 'POST',
					url: `https://api.plumoai.com/company/grid/grid/?projectId=${project}&workitemTypeId=${table}&loadPartialData=false&sprintId=0`,
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
						'companyid': JSON.stringify(verifyResponse.data.companyIds),
          				'Content-Type': 'application/json'
					},
					body: {
						dataUpdateOnlyAfter:this.getNodeParameter('dataUpdatedAfter' ,0)!=null && this.getNodeParameter('dataUpdatedAfter',0)!=""?this.getNodeParameter('dataUpdatedAfter',0):undefined
					}
				});
				var fieldsData = recordsData.data.fields;
				var fieldsMap: any = {};
				fieldsData.forEach((field: any)=>{
					fieldsMap[field.proj_field_id] = field;
				});
				var records = Object.values(recordsData.data.records).map((record: any)=>{
					var recordMap: any = {};
					var recordKeys = Object.keys(record);
					for(var recordKey of recordKeys){
						if(fieldsMap[recordKey]){
							recordMap[fieldsMap[recordKey].field_name] = record[recordKey];
						}else if(recordKey.toLowerCase() == "proj_task_id"){
							recordMap["recordId"] = record[recordKey];
						}else if(recordKey.toLowerCase() == "proj_workitem_type_fid"){
							recordMap["tableId"] = record[recordKey];
						}else if(recordKey.toLowerCase() == "proj_workflow_status_fid"){
							recordMap["statusId"] = record[recordKey];
						}else{
							recordMap[recordKey] = record[recordKey];
						}
					}					
					return { ...recordMap };
				});

				return [this.helpers.returnJsonArray(records)];
			}
			else if(this.getNodeParameter('operation',0) == "add"){
				return await addRecord.call(this, credentials, verifyResponse, project, table);
			}
		}
		return [this.helpers.returnJsonArray([])];
		}catch(error ){
			throw new NodeOperationError(this.getNode(), (error as Error).stack?JSON.stringify((error as Error).stack):JSON.stringify(error));
		}
	}
	
}
async function addRecord(this: IExecuteFunctions, credentials: any, verifyResponse: any, project: any, table: any) {
	const status = this.getNodeParameter('status',0);
				const recordFields = this.getNodeParameter('recordFields',0);		
				var customFields = await getRecordFields.call(this, credentials.accessToken, verifyResponse);
				var taskBasicData = {
			project_fid: project,
			title: null,
			proj_workflow_status_fid: status,
			description: null,
			proj_workitem_type_fid: table,
			parent_task_fid: 0,
			sprint_fid: 0,
			external_task_id: 0,
			task_priority_fid: null,
			loggedin_user_id: verifyResponse.data.userId,
			is_scheduled: 0,
			is_recurring: 0,
			sched_task_id: 0,
			taskusers: [{
			  user_fid: verifyResponse.data.userId,
			  user_type_id: 1
			}],
			called_from: "Board"
				  } as any;
			  
				var taskBasicDataValues = [];
				for(var taskBasicDataKey of Object.keys(taskBasicData)){
			var fieldData = customFields.find((x:any) => x?.task_actual_fieldname?.toLowerCase() == taskBasicDataKey?.toLowerCase());
			taskBasicDataValues.push(fieldData);
			if(fieldData && (recordFields as any)?.value?.[`${fieldData.proj_field_id}`] ){
				taskBasicData[taskBasicDataKey] = (recordFields as any)?.value?.[`${fieldData.proj_field_id}`]??null;
			}
				}
			
			
				const data = {
			storeProcedureName: "usp_proj_add_quick_tasks",
			version: 4,
			parameters: {
			  p_Json: [
				taskBasicData
			  ]
			}
				  };
				  var recordOutput = await this.helpers.httpRequest({
			method: 'POST',
			url: 'https://api.plumoai.com/company/store/procedure/execute',
			body: data,
			headers: {
				'Authorization': "Bearer "+credentials.accessToken,
				'companyid':JSON.stringify(verifyResponse.data.companyIds)
			},
				  });
				  var fdata = [];
				  if(recordOutput.data.length > 0){
			var record = recordOutput.data[0].find((x:any) => x);
			for(var customField of customFields){
				var isText = false;
				if(customField.type?.toLowerCase() == "text_singleline" || customField.type?.toLowerCase() == "text_multiline" || customField.type?.toLowerCase() == "str_picklist"){
					isText = true;
				}
				var fieldValue = (recordFields as any)?.value?.[customField.proj_field_id];
				var field_value_json: any = null;
				
				if(fieldValue && fieldValue != null && fieldValue != "" && fieldValue != "null"){	
					if(customField.type?.toLowerCase() == "phone"){
						var countryCode = "";
						if(fieldValue.includes("-")){
							countryCode = fieldValue.split("-")[0];
							fieldValue = fieldValue.split("-")[1];
						}
						if(fieldValue.includes(" ")){
							countryCode = fieldValue.split(" ")[0];
							fieldValue = fieldValue.split(" ")[1];
						}
						field_value_json = {countrycode: countryCode, phonenumber: fieldValue};
						fieldValue = undefined;
					}	
					try{		
					const fieldData = {
						storeProcedureName: "usp_proj_update_task_details_onebyone",
						version: 3,
						parameters: {
						  p_Json: [
							{
							  p_task_fid: record.proj_task_id,
							  p_proj_field_fid: customField.proj_field_id,
							  p_field_quotes_required: isText ? 1 : 0,
							  p_field_value: fieldValue,
							  p_field_text: customField.type?.toLowerCase() == "text_multiline" ? fieldValue : "",
							  p_field_users: null,
							  p_field_teams:null,
							  p_field_user_type: "",
							  p_field_json_value: field_value_json,
							  p_uniquefield: null,
							  p_loggedin_user: verifyResponse.data.userId,
							}
						  ]
						}
					};
					fdata.push({fieldData, isText, type:customField.type});
					await this.helpers.httpRequest({
						method: 'POST',
						url: 'https://api.plumoai.com/company/store/procedure/execute',
						body: fieldData,
						headers: {
							'Authorization': "Bearer "+credentials.accessToken,
							'companyid':JSON.stringify(verifyResponse.data.companyIds)
						},
					});
					}catch(error){
					}
				}
			}

			const items = this.getInputData();

			for (let i = 0; i < items.length; i++) {
				const binaryPropertyName = this.getNodeParameter('attachment', i) as string;
				try{
				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
				const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
				const fileName = binaryData.fileName;
				// const mimeType = binaryData.mimeType;

				// // Now you can use the file — for example, send to API
				// // Example with axios:
				const formData = new FormData();
				formData.append('file', buffer, fileName);
				formData.append('companyId', verifyResponse.data.companyIds[0]);
				formData.append('folderName', "field_attachments");
				
				const fileUploadResponse = await this.helpers.httpRequest({
					method: 'POST',
					url: 'https://api.plumoai.com/company/file/upload',				
					body: formData,
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
						...formData.getHeaders()
					},
				});

				await this.helpers.httpRequest({
					method: 'POST',
					url: 'https://api.plumoai.com/company/store/procedure/execute',
					body: {
						"storeProcedureName":"usp_proj_save_task_attachment",
						"version":3,
						"parameters":{
							"p_Json":[
								{ "proj_task_attachement_id":0,"task_fid":record.proj_task_id,"description":fileName,"attachment":fileUploadResponse.data.key,"loggedin_user":verifyResponse.data.userId,"action":"I"}]}},
					headers: {
						'Authorization': "Bearer "+credentials.accessToken,
						'companyid':JSON.stringify(verifyResponse.data.companyIds)
					},
				});
				}catch(error){
					
				}
			}




			var recordDetail = {"storeProcedureName":"usp_proj_get_detailed_tasks","version":2,"parameters":{"p_task_Id":record.proj_task_id}}
			var recordDetailOutput = await this.helpers.httpRequest({
				method: 'POST',
				url: 'https://api.plumoai.com/company/store/procedure/execute',
				body: recordDetail,
				headers: {
					'Authorization': "Bearer "+credentials.accessToken,
					'companyid':JSON.stringify(verifyResponse.data.companyIds)
				},
			});


			if(recordDetailOutput.data.length > 0){
				var record = recordDetailOutput.data[0].find((x:any) => x);
				var recordCustomFields = recordDetailOutput.data[1] as any;
				var completeRecord = {
					...record
				} as any;
				for(var customField of recordCustomFields){
					completeRecord[customField.field_name] = customField.field_value??customField.field_value_text??customField.field_json_value;
				}
				return [this.helpers.returnJsonArray([completeRecord])];
			}
			
			throw new NodeOperationError(this.getNode(), "Failed to add record");
		
				  }else{
					throw new NodeOperationError(this.getNode(), "Failed to add record");
				  }
}
async function getRecordFields(this: ILoadOptionsFunctions | IExecuteFunctions, credentials: any, verifyResponse: any) {
	const response = await this.helpers.httpRequest({
		method: 'POST',
		url: 'https://api.plumoai.com/company/store/procedure/execute',
		body: {
			"storeProcedureName": "usp_proj_get_project_fields", "version": 2,
			"parameters": { "p_project_fid": this.getNodeParameter('project', 0), "p_proj_workitem_type_fid": this.getNodeParameter('table', 0) }
		},
		headers: {
			'Authorization': "Bearer " + credentials,
			'companyid': JSON.stringify(verifyResponse.data.companyIds)
		},
	});

	const currentNodeData = this.getWorkflowStaticData('node');
	currentNodeData.recordFields = response.data[0];
	var customFields = response.data[0];
	return customFields;
}
 async function getTables(this: IExecuteFunctions|ILoadOptionsFunctions, credentials: any, verifyResponse: any) {
	return await this.helpers.httpRequest({
		method: 'POST',
		url: 'https://api.plumoai.com/company/store/procedure/execute',
		body: {
			"storeProcedureName": "usp_proj_get_projectworkflow",
			"parameters": {
				"p_project_id": this.getNodeParameter('project', 0),
			}
		},
		headers: {
			'Authorization': "Bearer " + credentials.accessToken,
			'companyid': JSON.stringify(verifyResponse.data.companyIds)
		},
	});
}
// async function getCredentialsAndVerify (this: IHookFunctions) {
// 	const credentials = await this.getCredentials('plumoaiApi');
// 	const verifyResponse = await this.helpers.httpRequest({
// 		method: 'GET',
// 		url: 'https://api.plumoai.com/Auth/oauth/me',
// 		headers: {
// 			'Authorization': "Bearer "+credentials.accessToken,
// 		},
// 	});
// 	return { credentials, verifyResponse };
// }	
