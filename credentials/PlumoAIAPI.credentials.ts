import type {
	Icon,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class PlumoAIAPI implements ICredentialType {
	name = 'plumoAIAPI';

	displayName = 'PlumoAI API Credentials';
	icon: Icon = 'file:../icons/plumoai.png';
	documentationUrl = 'https://plumoai.com/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			description: 'The access token of your PlumoAI work environment',
			placeholder: 'Access Token',
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = requestOptions.headers ?? {};
		requestOptions.headers['Authorization'] = `Bearer ${credentials.accessToken}`;
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			url: 'https://api.plumoai.com/Auth/oauth/me',
			method: 'GET',
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'aud',
					message: 'Success',
					value: 'PlumoAi.com',
				},
			},
		],
	};
}
