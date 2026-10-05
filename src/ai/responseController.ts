import { ChatMessage, ConversationMode } from '../types';
import { inferenceEngine } from './inferenceEngine';
import { sessionManager } from '../privacy/sessionManager';

export class ResponseController {
  private isGenerating = false;

  public getIsGenerating(): boolean {
    return this.isGenerating;
  }

  /**
   * Dispatches a message through the conversation pipeline
   */
  public async handleUserMessage(
    text: string,
    onProgress: (partialMessage: ChatMessage) => void
  ): Promise<ChatMessage> {
    if (this.isGenerating) {
      inferenceEngine.abortGeneration();
    }

    this.isGenerating = true;

    // Record user message in ephemeral session memory
    sessionManager.addContext({
      role: 'user',
      content: text,
      timestamp: Date.now(),
    });

    const assistantMsgId = 'samjho-' + Date.now();
    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      sender: 'samjho',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
      mode: 'ask',
    };

    try {
      const result = await inferenceEngine.generateResponse(
        text,
        (_chunk, fullText) => {
          assistantMessage.text = fullText;
          onProgress({ ...assistantMessage });
        }
      );

      assistantMessage.text = result.text;
      assistantMessage.mode = result.mode;
      assistantMessage.isStreaming = false;

      // Push final completed state to UI
      onProgress({ ...assistantMessage });

      // Add to session context
      sessionManager.addContext({
        role: 'assistant',
        content: assistantMessage.text,
        timestamp: Date.now(),
      });

      this.isGenerating = false;
      return assistantMessage;
    } catch (err: any) {
      this.isGenerating = false;
      assistantMessage.text = 'Something went wrong. Please try again.';
      assistantMessage.isError = true;
      assistantMessage.isStreaming = false;
      onProgress({ ...assistantMessage });
      return assistantMessage;
    }
  }

  /**
   * Stop generation immediately (PRD Section 31)
   */
  public stop(): void {
    inferenceEngine.abortGeneration();
    this.isGenerating = false;
  }
}

export const responseController = new ResponseController();
