import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';


export class PlumoAiAigentChatTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PlumoAI Aigent Chat Trigger',
		name: 'plumoAiAigentChatTrigger',
		icon: { light: 'file:../../icons/plumoai.png', dark: 'file:../../icons/plumoai.dark.png' },
		group: ['trigger'],
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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
						name: 'Access Token',
						value: 'accessToken',
					},					
				],
				default: 'accessToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					
				],
				default: 'issue',
			},
			
		],
	};

	methods = {
		
	};
}
