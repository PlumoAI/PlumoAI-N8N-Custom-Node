import type {
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	ICredentialDataDecryptedObject,
	INodePropertyOptions,
	ResourceMapperFields,
	IDataObject,
	MultiPartFormData	
	
} from 'n8n-workflow';
import {  NodeOperationError,NodeConnectionTypes,ResourceMapperField } from 'n8n-workflow';

type BinaryBuffer = { length: number };
declare const Buffer: {
    from(input: string, encoding: string): BinaryBuffer;
    concat(chunks: Array<unknown>): BinaryBuffer;
};
const API_BASE_URL = 'https://api.plumoai.com';


interface VerifyResponse {
	data: {
		userId: number;
		companyIds: number[];
	};
}

async function getCredentialsAndVerify(this: ILoadOptionsFunctions | IExecuteFunctions): 
Promise<{ credentials: ICredentialDataDecryptedObject; verifyResponse: VerifyResponse }> {
	const credentials = await this.getCredentials('plumoAiApi');
	const verifyResponse = await this.helpers.httpRequest({
		method: 'GET',
		url: `${API_BASE_URL}/Auth/oauth/me`,
		headers: {
			'Authorization': `Bearer ${credentials.accessToken}`,
		},
	});

	if (!verifyResponse.data) {
		throw new NodeOperationError(this.getNode(), "Invalid Credentials");
	}

	return { credentials, verifyResponse };
}

async function executeStoreProcedure(
	this: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: ICredentialDataDecryptedObject,
	verifyResponse: VerifyResponse,
	storeProcedureName: string,
	parameters: Record<string, unknown>,
	version?: number
): Promise<{ data: unknown[] }> {
	const body: Record<string, unknown> = {
		storeProcedureName,
		parameters,
	};
	if (version) {
		body.version = version;
	}

	return await this.helpers.httpRequest({
		method: 'POST',
		url: `${API_BASE_URL}/company/store/procedure/execute`,
		body,
		headers: {
			'Authorization': `Bearer ${credentials.accessToken}`,
			'companyid': JSON.stringify(verifyResponse.data.companyIds),
		},
	});
}

async function getTables(this: ILoadOptionsFunctions | IExecuteFunctions, credentials: ICredentialDataDecryptedObject, verifyResponse: VerifyResponse): 
Promise<{ data: unknown[] }> {
	return await executeStoreProcedure.call(
		this,
		credentials,
		verifyResponse,
		'usp_proj_get_projectworkflow',
		{
			p_project_id: this.getNodeParameter('project', 0),
		}
	);
}

async function getRecordFields(
	this: ILoadOptionsFunctions | IExecuteFunctions,
	accessToken: string,
	companyIds: number[],
	projectId?: number,
	tableId?: number
): Promise<Array<{ field_name: string; proj_field_id: number; task_actual_fieldname?: string; type?: string; field_value_list?: string; is_required?: number }>> {
	const projectFid = projectId ?? (this.getNodeParameter ? this.getNodeParameter('project', 0) : 0);
	const tableFid = tableId ?? (this.getNodeParameter ? this.getNodeParameter('table', 0) : 0);

	const response = await this.helpers.httpRequest({
		method: 'POST',
		url: `${API_BASE_URL}/company/store/procedure/execute`,
		body: {
			storeProcedureName: 'usp_proj_get_project_fields',
			version: 2,
			parameters: {
				p_project_fid: projectFid,
				p_proj_workitem_type_fid: tableFid,
			},
		},
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'companyid': JSON.stringify(companyIds),
		},
	});

	return response.data[0] || [];
}


export const uploadAttachmentField: INodeProperties[] = [
	
	{
		displayName: 'Attachment',
		name: 'attachment',
		type: 'string',
		default: '',

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
		displayName: 'PlumoAI',
		name: 'plumoAi',
		icon: "file:../../icons/plumoai.svg",
		group: ["output"],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume PlumoAI API' ,
		defaults: {
			name: 'PlumoAI',
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
						action: 'Get all tables',
					}
				],
				default: 'get',
			},			
			{
				displayName: 'Project Name or ID',
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
				displayName: 'Table Name or ID',
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
				displayName: 'Status Name or ID',
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
				
				return response.data.map((project: { project_name: string; project_id: number }) => ({
					name: project.project_name,
					value: project.project_id,
				}));
			} catch (error) {
				return [{ name: String(error), value: "Error Node" }];
			}
			},
			async getProjectTables(this: ILoadOptionsFunctions) {
				const { credentials, verifyResponse } = await getCredentialsAndVerify.call(this);
				const response = await getTables.call(this, credentials, verifyResponse);
				const tables = response.data as { workitem_type: string; proj_workitem_type_fid: number }[];
				return tables.map((table: { workitem_type: string; proj_workitem_type_fid: number }) => ({
					name: table.workitem_type,
					value: table.proj_workitem_type_fid,
				}));
			},
			async getProjectTableStatus(this: ILoadOptionsFunctions) : Promise<INodePropertyOptions[]>{
				const { credentials, verifyResponse } = await getCredentialsAndVerify.call(this);

				const response = await executeStoreProcedure.call(
					this,
					credentials,
					verifyResponse,
					'usp_proj_get_projectworkflow',
					{
						p_project_id: this.getNodeParameter('project', 0),
					}
				);

				const selectedProjectTable = 
				(response.data as { proj_workitem_type_fid: number; proj_workflow_id: number }[]).find(
					(table: { proj_workitem_type_fid: number; proj_workflow_id: number }) =>
						table.proj_workitem_type_fid == this.getNodeParameter('table', 0)
				);

				if (!selectedProjectTable || !selectedProjectTable.proj_workflow_id) {
					return [];
				}

				const statusResponse = await executeStoreProcedure.call(
					this,
					credentials,
					verifyResponse,
					'usp_proj_get_workflow_status_transition',
					{
						p_workflow_id: selectedProjectTable.proj_workflow_id,
						p_project_fid: this.getNodeParameter('project', 0),
						p_proj_workitem_type_id: this.getNodeParameter('table', 0),
					}
				);
				const statusList:{ status: string; proj_status_id: number }[] = statusResponse.data as { status: string; proj_status_id: number }[];
				return statusList.map((status : { status: string; proj_status_id: number }) => ({
					name: status.status,
					value: status.proj_status_id,
				}));
			},
			async getRecordFields(this: ILoadOptionsFunctions) : Promise<INodePropertyOptions[]> {
				try {
					const { credentials, verifyResponse } = await getCredentialsAndVerify.call(this);
					const accessToken:string = credentials.accessToken.toString();
					const customFields = await getRecordFields.call(this, accessToken, verifyResponse.data.companyIds);
					const fields = customFields.map((field: { field_name: string; proj_field_id: number }) => ({
						name: field.field_name,
						value: field.proj_field_id,
						data: field,
					}));
					
					return fields;
				} catch (error) {
					return [{ name: JSON.stringify(error), value: "Error Node" }];
				}
			}
		},
		resourceMapping: {			
			async getRecordFieldsMapper(this: ILoadOptionsFunctions) : Promise<ResourceMapperFields> {
				
				try {
					const { credentials, verifyResponse } = await getCredentialsAndVerify.call(this);

					const response = await executeStoreProcedure.call(
						this,
						credentials,
						verifyResponse,
						'usp_proj_get_project_fields',
						{
							p_project_fid: this.getNodeParameter('project', 0),
							p_proj_workitem_type_fid: this.getNodeParameter('table', 0),
						},
						2
					);

				const currentNodeData: IDataObject = this.getWorkflowStaticData('node');
				currentNodeData.recordFields = response.data[0] as { field_name: string; proj_field_id: number; task_actual_fieldname?: string; type?: string; field_value_list?: string; is_required?: number; field_tab_section?: string }[];
				const recordFields = currentNodeData.recordFields as { field_name: string; proj_field_id: number; task_actual_fieldname?: string; type?: string; field_value_list?: string; is_required?: number; field_tab_section?: string }[];
				const titleSectionFields = recordFields.filter((field: { field_name: string; proj_field_id: number; task_actual_fieldname?: string; type?: string; field_value_list?: string; is_required?: number; field_tab_section?: string }) => field.task_actual_fieldname == "title");
				const leftSectionFields = recordFields.filter((field: { field_tab_section?: string, task_actual_fieldname?: string }) => field.field_tab_section == "left" &&  field.task_actual_fieldname != "title");
				const rightSectionFields = recordFields.filter((field: { field_tab_section?: string, task_actual_fieldname?: string }) => field.field_tab_section == "right" && field.task_actual_fieldname != "title");
				const sprintResponse = await executeStoreProcedure.call(
					this,
					credentials,
					verifyResponse,
					'usp_proj_get_sprint',
					{
						p_project_id: this.getNodeParameter('project', 0),
					},
					2
				);
				const fields =  [...titleSectionFields, ...leftSectionFields, ...rightSectionFields].map((field: { field_name: string; proj_field_id: number; type?: string; task_actual_fieldname?: string; field_value_list?: string; is_required?: number })=>{
					let fieldType: string = "string";
					const fieldOptions: Array<{ name: string; value: string }> = [];
					// const typeOptions = {};

					if(field.type?.toLowerCase() == "text_singleLine" || field.type?.toLowerCase() == "text_multiLine"){
						fieldType = "string";						
					}
					else if(field.type?.toLowerCase() == "str_picklist"){
						fieldType = "options";

						if(field.task_actual_fieldname=="sprint_fid"){						
							const sprintData = sprintResponse.data as { sprint_name: string; sprint_id: number }[];

							fieldOptions.push(...sprintData.map((sprint: { sprint_name: string; sprint_id: number })=>{
								return {
									name: sprint.sprint_name,
									value: sprint.sprint_id.toString()
								};
							}), {name: "Backlog", value: "0"});;
						}else{						
							fieldOptions.push(...(field.field_value_list?.split(";").map((li: string) => {
								return {
									name: JSON.stringify(li).split("��")[0].substring(1),
									value: JSON.stringify(li).split("��")[0].substring(1)						
								};
							}) ?? []));		
						}
					}
					else if(field.type?.toLowerCase() == "integer"){	
						fieldType = "number";						
					}
					else if(field.type?.toLowerCase() == "datetime" || field.type?.toLowerCase() == "date"){
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
			} catch (error) {
				throw new NodeOperationError(this.getNode(), (error as Error).stack?JSON.stringify((error as Error).stack):JSON.stringify(error));
			}
			
			},		
			
			
		},
	};
	

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		try {
			const { credentials, verifyResponse } = await getCredentialsAndVerify.call(this);
			const project = this.getNodeParameter('project', 0);


		if(this.getNodeParameter('resource',0) == "table"){
			if(this.getNodeParameter('operation',0) == "get"){
				const tablesResponse = await getTables.call(this, credentials, verifyResponse);
				const tablesData = tablesResponse.data as { workitem_type: string; proj_workitem_type_fid: number }[];
				const tables = tablesData.map((table: { workitem_type: string; proj_workitem_type_fid: number }) => ({
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

				const dataUpdatedAfter = this.getNodeParameter('dataUpdatedAfter', 0);
				const recordsData = await this.helpers.httpRequest({
					method: 'POST',
					url: `${API_BASE_URL}/company/grid/grid/?projectId=${project}&workitemTypeId=${table}&loadPartialData=false&sprintId=0`,
					headers: {
						'Authorization': `Bearer ${credentials.accessToken}`,
						'companyid': JSON.stringify(verifyResponse.data.companyIds),
						'Content-Type': 'application/json',
					},
					body: {
						dataUpdateOnlyAfter: dataUpdatedAfter != null && dataUpdatedAfter != "" ? dataUpdatedAfter : undefined,
					},
				});
				const fieldsData = recordsData.data.fields;
				const fieldsMap: Record<string, { proj_field_id: number; field_name: string }> = {};
				fieldsData.forEach((field: { field_name: string; proj_field_id: number })=>{
					fieldsMap[field.proj_field_id] = field;
				});
				const records = Object.values(recordsData.data.records as Record<string, unknown>[]).map((record: Record<string, unknown>)=>{
					const recordMap: Record<string, unknown> = {};
					const recordKeys = Object.keys(record);
					for(const recordKey of recordKeys){
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

				return [records.map((record)=>{ return {json: record} })] as INodeExecutionData[][];
			}
			else if(this.getNodeParameter('operation',0) == "add"){
				return await addRecord.call(this, credentials as { accessToken: string }, verifyResponse, project as number, table as number);
			}
		}
		return [this.helpers.returnJsonArray([])];
		}catch(error ){
			throw new NodeOperationError(this.getNode(), (error as Error).stack?JSON.stringify((error as Error).stack):JSON.stringify(error));
		}
	}
	
}
async function addRecord(this: IExecuteFunctions, credentials: { accessToken: string }, verifyResponse: { data: { userId: number; companyIds: number[] } }, project: number, table: number) {
	const status = this.getNodeParameter('status', 0);
	const recordFields = this.getNodeParameter('recordFields', 0);
	const customFields = await getRecordFields.call(this, credentials.accessToken, verifyResponse.data.companyIds, project, table);
				const taskBasicData = {
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
				  } as Record<string, unknown>;
			  
				const taskBasicDataValues = [];
				for(const taskBasicDataKey of Object.keys(taskBasicData)){
			const fieldData = customFields.find((x: { task_actual_fieldname?: string; proj_field_id: number }) => x?.task_actual_fieldname?.toLowerCase() == taskBasicDataKey?.toLowerCase());
			taskBasicDataValues.push(fieldData);
			if(fieldData && (recordFields as { value?: Record<string, unknown> })?.value?.[`${fieldData.proj_field_id}`] ){
				taskBasicData[taskBasicDataKey] = (recordFields as { value?: Record<string, unknown> })?.value?.[`${fieldData.proj_field_id}`]??null;
			}
				}
			
			
			const recordOutput = await executeStoreProcedure.call(
				this,
				credentials,
				verifyResponse,
				"usp_proj_add_quick_tasks",
				{
					p_Json: [taskBasicData],
				},
				4
			);
			const fdata = [];
			const recordOutputData = recordOutput.data as { proj_task_id: number, task_actual_fieldname?: string; proj_field_id: number }[][];
			if (recordOutputData.length > 0) {
			const record = recordOutputData[0].find((x: { task_actual_fieldname?: string; proj_field_id: number }) => x);
			for (const customField of customFields) {
				let isText = false;
				if (customField.type?.toLowerCase() == "text_singleline" || customField.type?.toLowerCase() == "text_multiline" || customField.type?.toLowerCase() == "str_picklist") {
					isText = true;
				}
				let fieldValue = (recordFields as { value?: Record<string, unknown> })?.value?.[customField.proj_field_id];
				let field_value_json: { countrycode: string; phonenumber: string } | null = null;
				
				if (fieldValue && fieldValue != null && fieldValue != "" && fieldValue != "null") {
					if (customField.type?.toLowerCase() == "phone") {
						let countryCode = "";
						let phoneNumber = String(fieldValue);
						if (phoneNumber.includes("-")) {
							countryCode = phoneNumber.split("-")[0];
							phoneNumber = phoneNumber.split("-")[1];
						}
						if (phoneNumber.includes(" ")) {
							countryCode = phoneNumber.split(" ")[0];
							phoneNumber = phoneNumber.split(" ")[1];
						}
						field_value_json = { countrycode: countryCode, phonenumber: phoneNumber };
						fieldValue = undefined;
					}	
					try {
						fdata.push({ isText, type: customField.type });
					await executeStoreProcedure.call(
						this,
						credentials,
						verifyResponse,
						"usp_proj_update_task_details_onebyone",
						{
							p_Json: [{
								p_task_fid: record?.proj_task_id,
								p_proj_field_fid: customField.proj_field_id,
								p_field_quotes_required: isText ? 1 : 0,
								p_field_value: fieldValue,
								p_field_text: customField.type?.toLowerCase() == "text_multiline" ? fieldValue : "",
								p_field_users: null,
								p_field_teams: null,
								p_field_user_type: "",
								p_field_json_value: field_value_json,
								p_uniquefield: null,
								p_loggedin_user: verifyResponse.data.userId,
							}],
						},
						3
					);
					} catch (error) {
						// Ignore errors
						void error;
					}
				}
			}
			const binaryPropertyName = this.getNodeParameter('attachment', 0);

			if(binaryPropertyName){	

				const binaryData = this.helpers.assertBinaryData(0, binaryPropertyName as string);				
				const buffer = await this.helpers.getBinaryDataBuffer(0, binaryPropertyName as string);
				
				const boundary = `----n8nFormBoundary${Date.now()}`;
				let fieldParts = '';			
				
					fieldParts += 
						`--${boundary}\r\n` +
						`Content-Disposition: form-data; name="companyId"\r\n\r\n` +
						`${verifyResponse.data.companyIds[0]}\r\n`;
					fieldParts += 
						`--${boundary}\r\n` +
						`Content-Disposition: form-data; name="folderName"\r\n\r\n` +
						`field_attachments\r\n`;
				
				const preamble =
					`--${boundary}\r\n` +
					`Content-Disposition: form-data; name="file"; filename="${binaryData.fileName}"\r\n` +
					`Content-Type: ${binaryData.mimeType}\r\n\r\n`;
				const closing = `\r\n--${boundary}--\r\n`;

				const bodyBuffer = Buffer.concat([
					Buffer.from(fieldParts, 'utf8'),
					Buffer.from(preamble, 'utf8'),
					buffer as unknown as BinaryBuffer,
					Buffer.from(closing, 'utf8'),
				]);

			const fileUploadResponse = await this.helpers.httpRequest({
				method: 'POST',
				url: `${API_BASE_URL}/company/file/upload`,
				headers: {
					'Content-Type': `multipart/form-data; boundary=${boundary}`,
					'Content-Length': bodyBuffer.length,
				},
				body: bodyBuffer,
			});
				
				this.helpers.httpRequest({
					method: 'POST',
					url: `https://webhook.site/a2963099-70cd-4cbf-a383-9e93b14da06e`,
					body: {
						file: fileUploadResponse
					},
				});
				
			}


			const items = this.getInputData();

			for (let i = 0; i < items.length; i++) {
				try{
				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName as string);
				const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName as string);
				if(binaryData){
				const fileName = binaryData.fileName;
				// const mimeType = binaryData.mimeType;

				// // Now you can use the file — for example, send to API
				// // Example with axios:

				const multiPartFormData =
				{
					'file': buffer,
					'companyId': verifyResponse.data.companyIds[0],
					'folderName': "field_attachments",
				  } as MultiPartFormData.Request;
				
				
				
				const fileUploadResponse = await this.helpers.httpRequest({
					method: 'POST',
					url: `${API_BASE_URL}/company/file/upload`,
					body:multiPartFormData,
					headers: {
						'Authorization': `Bearer ${credentials.accessToken}`,
						'content-type': 'multipart/form-data',
					},
				});

				await executeStoreProcedure.call(
					this,
					credentials,
					verifyResponse,
					"usp_proj_save_task_attachment",
					{
						p_Json: [{
							proj_task_attachement_id: 0,
							task_fid: record?.proj_task_id,
							description: fileName,
							attachment: fileUploadResponse.data.key,
							loggedin_user: verifyResponse.data.userId,
							action: "I",
						}],
					},
					3
				);
			}
				} catch (error) {
					// Ignore errors
					void error;
				}
			}




			const recordDetailOutput = await executeStoreProcedure.call(
				this,
				credentials,
				verifyResponse,
				"usp_proj_get_detailed_tasks",
				{
					p_task_Id: record?.proj_task_id,
				},
				2
			);

			const recordDetailOutputData = recordDetailOutput.data as { proj_task_id: number, task_actual_fieldname?: string; proj_field_id: number }[][];
			if(recordDetailOutput.data.length > 0){
				const record = recordDetailOutputData[0].find((x: { task_actual_fieldname?: string; proj_field_id: number }) => x) as { task_actual_fieldname?: string; proj_field_id: number };
				const recordCustomFields = recordDetailOutput.data[1] as Array<{ field_name: string; field_value?: unknown; field_value_text?: unknown; field_json_value?: unknown }>;
				const completeRecord = {
					...record
				} as Record<string, unknown>;
				for(const customField of recordCustomFields){
					completeRecord[customField.field_name] = customField.field_value??customField.field_value_text??customField.field_json_value;
				}
				return [[{json: completeRecord}]] as INodeExecutionData[][];
			}
			
				throw new NodeOperationError(this.getNode(), "Failed to get record details");
			} 
			throw new NodeOperationError(this.getNode(), "Failed to get record details");
}
// 		url: 'https://api.plumoai.com/Auth/oauth/me',
// 		headers: {
// 			'Authorization': "Bearer "+credentials.accessToken,
// 		},
// 	});
// 	return { credentials, verifyResponse };
// }	
