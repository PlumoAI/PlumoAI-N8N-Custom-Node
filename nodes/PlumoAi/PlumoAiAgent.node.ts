import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';


export class PlumoAIAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PlumoAI Agent',
		name: 'plumoAIAgent',
		icon: "file:../../icons/plumoai.png",
		group: ["output"],
		inputs: [NodeConnectionTypes.AiLanguageModel],
		requiredInputs: [1],	
		inputNames: ["Ai Language Model"],
		outputNames: ["Ai Agent"],
		mockManualExecution:undefined,
		maxNodes:1,
		outputs: [NodeConnectionTypes.Main],
		version: 1,
		description: 'Consume PlumoAI Agent API',
		defaults: {
			name: 'PlumoAI Agent',
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
