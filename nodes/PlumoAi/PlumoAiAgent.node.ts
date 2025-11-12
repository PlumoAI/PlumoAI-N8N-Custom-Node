import { NodeConnectionTypes, type INodeType, type INodeTypeDescription, IWebhookResponseData, IWebhookFunctions, ILoadOptionsFunctions, NodeOperationError, IHookFunctions } from 'n8n-workflow';

const API_BASE_URL = 'https://api.plumoai.com';

export class PlumoAiAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PlumoAi Agent',
		name: 'plumoAiAgent',
		icon: "fa:robot",
		group: ["output"],
		inputs: [NodeConnectionTypes.AiLanguageModel],
		requiredInputs: [1],		
		badgeIconUrl: "https://app.plumoai.com/favicon.png",
		iconUrl: "https://app.plumoai.com/favicon.png",
		iconBasePath: "file:../../icons/plumoai.png",
		inputNames: ["Ai Language Model"],
		outputNames: ["Ai Agent"],
		mockManualExecution:undefined,
		maxNodes:1,
		outputs: [NodeConnectionTypes.Main],
		version: 1,
		description: 'Consume PlumoAi Agent API',
		defaults: {
			name: 'PlumoAi Agent',
		},
		usableAsTool: true,
		credentials: [
			
		],
		
		properties: [
			
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					
				],
				default: [],
			},
			
			
		],
	};

	methods = {
	
	};
	
}
