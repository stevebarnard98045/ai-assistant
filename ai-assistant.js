import { html, LitElement, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/all/lit-all.min.js';


export class AIAssistant extends LitElement {

  static properties = {
    apiKey: { type: String },
    aiSystemPrompt: { type: String },
    aiModel: { type: String },
    aiPrompt: { type: String },
    allowSystemPrompt: { type: Boolean}
  };

  static styles = css`
  .ai-assistant {
    color: #898F94;
    min-width: 405px;
  }
  .ai-assistant.waiting {
    cursor: wait;
  }
  .ai-assistant input {
    caret-color: #161718;
    color: #161718;
    border: 1px solid #898F94;
    font-family: "Open Sans", "Helvetica", "Arial", sans-serif;
    background: #FFFFFF;
    font-size: 14px;
    border-radius: 4px;
    height:27px;
    margin: 10px;
  }
  .ai-assistant input[id="user-input"],
  .ai-assistant input[id="system-input"] {
    width:96%;
  }
  .ai-assistant input[id="system-input"]:disabled {
    background: #ddd;
  }
  .ai-assistant input[id="user-input-send"] {
    background: #FED1B0;
    cursor: pointer;
  }
  .ai-assistant input[id="user-input-send"].waiting {
    background: #ddd;
    cursor: wait;
  }
  .ai-assistant .ai-response {
    font-size: 14px;
    font-family: "Open Sans", "Helvetica", "Arial", sans-serif;
    border: 1px solid #898F94;
    border-radius: 4px;
    padding: 17px;
    margin: 10px;
    width: 92%;
  }
  `;

  static getMetaConfig() {
    return {
      controlName: 'AI Assistant',
      pluginAuthor: 'Deon Smit',
      fallbackDisableSubmit: false,
      groupName: 'AI',
      version: '0.1',
      properties: {
        apiKey: {
          title: 'API Key',
          type: 'string'
        },
        aiSystemPrompt: {
          title: 'AI System Prompt or Persona',
          type: 'string',
          defaultValue: 'You are a Helpful AI Assistant'
        },
        aiPrompt: {
          title: 'AI Prompt',
          type: 'string'
        },
        aiResponse: {
          title: 'AI Response',
          type: 'string',
          isValueField: true
        },
        aiModel: {
          title: 'AI Model',
          type: 'string',
          enum: ['gpt-4', 'gpt-4-32k', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
          showAsRadio: false,
          verticalLayout: true,
          defaultValue: 'gpt-3.5-turbo'
        },
        allowSystemPrompt: {
          title: 'Allow Change to AI System Prompt',
          type: 'boolean',
          defaultValue: true
        }
      },
      standardProperties: {
        description: true,
        defaultValue: false,
        visibility: true,
        fieldLabel: false,
        toolTip: false
      },
      designer: {
        canvasRestrictions: {
          minSize: 6
        }
      },
      events: ["ntx-value-change"],
    };
  }

  constructor() {
    super();
    this.allowSystemPrompt = true;
    this.aiResponse = 'Awaiting input from Human...';
  }

  shouldUpdate(changedProperties) {
    if (this.aiSystemPrompt && this.shadowRoot.getElementById("system-input")) { 
        if(changedProperties.size > 0 && (changedProperties.has('aiSystemPrompt') || changedProperties.has('aiModel') || changedProperties.has('aiPrompt'))) {
          this.shadowRoot.getElementById("system-input").value = this.aiSystemPrompt;
          this.shadowRoot.getElementById("user-input").value = this.aiPrompt;
          this._getAICompletion(this);
        }
        
    }
    return (changedProperties.has('aiSystemPrompt') && changedProperties.get("aiSystemPrompt") === undefined || changedProperties.size == 0 || changedProperties.has('aiModel') || changedProperties.has('allowSystemPrompt'));
  }

  render() {
    return html`
    <div class="ai-assistant" id="ai-assistant-body">
    <label for="system-input" ?hidden="${!this.allowSystemPrompt}">Rules of engagement/AI persona for this interaction:</label><br/>
    <input type="text" id="system-input" name="system-input" ?hidden="${!this.allowSystemPrompt}" ?disabled="${!this.allowSystemPrompt}" value="${this.aiSystemPrompt}">
    <label for="user-input">What do you want to ask the AI Assistant?</label><br/>
    <input type="text" id="user-input" name="user-input" value="${this.aiPrompt}">
    <input type="button" id="user-input-send" value="Submit" @click="${e => this._handleSend(e)}">
    <div class="ai-response" id="ai-response">
    ${this.aiResponse}
    </div>
    </div>
    `;
  }

  _handleSend(e) {
    this._getAICompletion(this);
  }

  _getAICompletion = (myElement) => {

    myElement.shadowRoot.getElementById('ai-assistant-body').classList.toggle("waiting"); 
    myElement.shadowRoot.getElementById('user-input-send').classList.toggle("waiting");
    myElement.shadowRoot.getElementById('user-input-send').disabled = true;
    myElement.shadowRoot.getElementById("ai-response").innerText = 'please wait...';
    const textPrompt = myElement.shadowRoot.getElementById("user-input").value;
    const systemPrompt = myElement.shadowRoot.getElementById("system-input").value;

    if (textPrompt ) {

        const url = 'https://api.openai.com/v1/chat/completions'; 

        const requestBody = {
          model: this.aiModel,
          messages: [
              {
                  role: 'system',
                  content: systemPrompt
              },
              {
                  role: 'user',
                  content: textPrompt
              }
          ]
      };
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      };
      
      fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      })
        .then(response => {
          if (response.ok) {
            return response.json(); 
          } else {
            throw new Error('Request failed with status: ' + response.status);
          }
        })
        .then(data => {
          const responseText = data.choices[0].message.content
          const args = {
            bubbles: true,
            cancelable: false,
            composed: true,
            detail: responseText,
          };
          const event = new CustomEvent('ntx-value-change', args);
          myElement.dispatchEvent(event);
          myElement.shadowRoot.getElementById("ai-response").innerText = responseText;
          myElement.shadowRoot.getElementById('user-input-send').disabled = false;
          myElement.shadowRoot.getElementById('user-input-send').classList.toggle("waiting");
          this.shadowRoot.getElementById('ai-assistant-body').classList.toggle("waiting");
        })
        .catch(error => {
          console.error(error);
          myElement.shadowRoot.getElementById("ai-response").innerText = error;
          myElement.shadowRoot.getElementById('user-input-send').disabled = false;
          myElement.shadowRoot.getElementById('user-input-send').classList.toggle("waiting");
          this.shadowRoot.getElementById('ai-assistant-body').classList.toggle("waiting");
        });
    }

  }
  
}
const elementName = 'ai-assistant';
customElements.define(elementName, AIAssistant);
