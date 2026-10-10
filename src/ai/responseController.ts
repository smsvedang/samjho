import { ChatMessage, ConversationMode, FileAttachment } from '../types';
import { inferenceEngine } from './inferenceEngine';
import { sessionManager } from '../privacy/sessionManager';
import { buildAttachmentPromptContext } from './fileProcessor';

export class ResponseController {
  private isGenerating = false;
  private generationId = 0;

  public getIsGenerating(): boolean {
    return this.isGenerating;
  }

  /**
   * Dispatches a message through the conversation pipeline
   */
  public async handleUserMessage(
    text: string,
    arg2?: ((partialMessage: ChatMessage) => void) | FileAttachment[],
    arg3?: (partialMessage: ChatMessage) => void
  ): Promise<ChatMessage> {
    let attachments: FileAttachment[] | undefined;
    let onProgress: ((partialMessage: ChatMessage) => void) | undefined;

    if (typeof arg2 === 'function') {
      onProgress = arg2;
      attachments = undefined;
    } else {
      attachments = arg2;
      onProgress = arg3;
    }

    if (this.isGenerating) this.stop();

    this.isGenerating = true;
    const generationId = ++this.generationId;

    // Record user message with attachments in ephemeral session memory
    const contextContent = text + (attachments && attachments.length > 0 ? buildAttachmentPromptContext(attachments) : '');
    sessionManager.addContext({
      role: 'user',
      content: contextContent,
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
      statusText: 'Samjho is thinking...',
    };

    // Immediately push assistant message with thinking status so the chat is NEVER blank
    onProgress?.({ ...assistantMessage });

    try {
      const result = await inferenceEngine.generateResponse(
        text,
        (_chunk, fullText) => {
          if (generationId !== this.generationId) return;
          assistantMessage.text = fullText;
          assistantMessage.statusText = undefined;
          onProgress?.({ ...assistantMessage });
        },
        attachments,
        (status) => {
          if (generationId !== this.generationId) return;
          assistantMessage.statusText = status;
          onProgress?.({ ...assistantMessage });
        }
      );

      if (generationId !== this.generationId) return assistantMessage;

      assistantMessage.text = result.text;
      assistantMessage.mode = result.mode;
      assistantMessage.isStreaming = false;

      // Push final completed state to UI
      onProgress?.({ ...assistantMessage });

      // Add to session context
      sessionManager.addContext({
        role: 'assistant',
        content: assistantMessage.text,
        timestamp: Date.now(),
      });

      return assistantMessage;
    } catch (err: any) {
      if (generationId !== this.generationId) return assistantMessage;
      assistantMessage.text = 'Something went wrong. Please try again.';
      assistantMessage.isError = true;
      assistantMessage.isStreaming = false;
      onProgress?.({ ...assistantMessage });
      return assistantMessage;
    } finally {
      if (generationId === this.generationId) {
        this.isGenerating = false;
      }
    }
  }

  /**
   * Stop generation immediately (PRD Section 31)
   */
  public stop(): void {
    this.generationId += 1;
    inferenceEngine.abortGeneration();
    this.isGenerating = false;
  }
}

export const responseController = new ResponseController();
