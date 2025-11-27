# @plumoai/n8n-nodes-plumoai

This is an n8n community node package that integrates [PlumoAI](https://plumoai.com) with your n8n workflows. It provides three powerful nodes to interact with PlumoAI's project management and AI agent capabilities.

PlumoAI is a comprehensive project management and workflow automation platform that helps teams organize, track, and automate their work processes.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  
[Version History](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Quick Installation

1. In n8n, go to **Settings** → **Community Nodes**
2. Click **Install a community node**
3. Enter the package name: `@plumoai/n8n-nodes-plumoai`
4. Click **Install**

Alternatively, install via npm:

```bash
npm install @plumoai/n8n-nodes-plumoai
```

## Operations

This package includes three nodes:

### 1. PlumoAI Node

The main node for interacting with PlumoAI data. Supports two resources:

#### Table Resource
- **Get All Tables**: Retrieve all tables (work item types) in a selected project

#### Record Resource
- **Get All Records**: Fetch all records from a table with optional date filtering
- **Add Record**: Create a new record with field mapping, file attachments, and status selection
- **Update Record**: Update existing records

**Key Features:**
- Dynamic field loading based on project and table selection
- Resource mapper for intuitive field mapping
- Support for various field types
- File attachment uploads

### 2. PlumoAI Trigger

Webhook trigger node that starts workflows when PlumoAI events occur.

**Available Events:**
- **Record Added**: Triggers when a new record is created
- **Record Updated**: Triggers when an existing record is modified
- **Record Added or Updated**: Triggers on both create and update events

**Features:**
- Automatically manages webhook configuration
- Receives complete record data when events occur
- Easy setup and configuration

### 3. PlumoAI Agent Trigger

AI Agent integration node that connects n8n AI Language Models with PlumoAI agents.

**Operations:**
- **Create New AI Agent**: Creates a new AI agent project in PlumoAI
- **Connect With Existing AI Agent**: Connects to an existing AI agent project

**Features:**
- Connects to n8n AI Language Model nodes
- Streaming responses
- Automatic chat name generation
- Workspace and agent management

## Credentials

### Prerequisites

You need a PlumoAI account and an access token to use these nodes.

### Setting Up Credentials

1. Log in to your PlumoAI account
2. Navigate to your account settings to generate an API access token
3. In n8n, when configuring a PlumoAI node:
   - Select **Credentials** → **Create New**
   - Choose **PlumoAI API Credentials**
   - Enter your **Access Token**
   - Click **Save**

### Authentication Method

- **API Token**: Secure token-based authentication
  - Your access token is securely stored and used for all API requests

## Compatibility

- **Minimum n8n version**: Compatible with n8n versions that support community nodes (n8n 0.200.0+)
- **Node.js**: Requires Node.js v22 or higher

## Usage

### Example 1: Creating a Record with File Attachment

1. Add a **PlumoAI** node to your workflow
2. Configure:
   - **Resource**: Record
   - **Operation**: Add Record
   - **Project**: Select your project
   - **Table**: Select the table/type
   - **Status**: Choose initial status
   - **Record Fields**: Map your input data to PlumoAI fields
   - **Attachment**: Specify binary property name (e.g., `data`)
3. Connect to a node that provides the data and file attachment
4. Execute the workflow

### Example 2: Triggering on Record Updates

1. Add a **PlumoAI Trigger** node to your workflow
2. Configure:
   - **Trigger On**: Select the event type (Record Added, Updated, or Both)
   - **Project**: Select the project to monitor
   - **Table**: Select the table to monitor
3. Connect subsequent nodes to process the triggered data
4. Activate the workflow

### Example 3: Creating an AI Agent

1. Add a **PlumoAI Agent Trigger** node
2. Connect an **AI Language Model** node (OpenAI, Anthropic, etc.)
3. Configure:
   - **Operation**: Create New AI Agent
   - **Workspace**: Select your workspace
   - **AI Agent Name**: Enter a name for your agent
4. The node will create the agent and set up the webhook automatically

### Field Mapping

The **Record Fields** resource mapper automatically:
- Loads all available fields for the selected project and table
- Detects field types
- Shows required fields
- Provides options for dropdown fields

### Dynamic Options

All nodes support dynamic option loading:
- **Projects**: Automatically loads from your PlumoAI account
- **Tables**: Loads based on selected project
- **Statuses**: Loads based on selected project and table
- **Workspaces**: Loads available workspaces for AI agents
- **Agents**: Loads existing agents in selected workspace

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [PlumoAI Documentation](https://plumoai.com/docs)
- [n8n Node Documentation](https://docs.n8n.io/integrations/creating-nodes/)
- [n8n Community Forum](https://community.n8n.io/)
- [GitHub Repository](https://github.com/PlumoAI/PlumoAI-N8N-Custom-Node)

## Version History

### 0.1.20
- Latest version with bug fixes and improvements

### Previous Versions
See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## Support

For issues, feature requests, or questions:
- Open an issue on [GitHub](https://github.com/PlumoAI/PlumoAI-N8N-Custom-Node/issues)
- Contact: hussain@plumoai.com

## License

[MIT](LICENSE.md)
