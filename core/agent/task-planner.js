/**
 * 10X.in Task Planner
 * Multi-step task planning and execution
 */

class TaskPlanner {
  constructor() {
    this.activePlan = null;
    this.executionHistory = [];
    this.maxSteps = 50;
    this.stepTimeout = 30000; // 30 seconds per step
  }

  /**
   * Create an execution plan from a parsed intent
   * @param {Object} parsedIntent - Output from IntentParser
   * @param {Object} context - Current page/session context
   * @returns {Object} Execution plan
   */
  createPlan(parsedIntent, context = {}) {
    const plan = {
      id: this.generateId(),
      intent: parsedIntent.intent,
      params: parsedIntent.params,
      context,
      steps: [],
      variables: {},
      status: 'created',
      createdAt: Date.now()
    };

    // Generate steps based on intent
    switch (parsedIntent.intent) {
      case 'SCRAPE':
        plan.steps = this.planScraping(parsedIntent.params, context);
        break;

      case 'CLICK':
        plan.steps = this.planClick(parsedIntent.params, context);
        break;

      case 'TYPE':
        plan.steps = this.planTyping(parsedIntent.params, context);
        break;

      case 'NAVIGATE':
        plan.steps = this.planNavigation(parsedIntent.params, context);
        break;

      case 'WAIT':
        plan.steps = this.planWait(parsedIntent.params, context);
        break;

      case 'WORKFLOW':
        plan.steps = this.planWorkflow(parsedIntent.params, context);
        break;

      case 'SCROLL':
        plan.steps = this.planScroll(parsedIntent.params, context);
        break;

      case 'FORM':
        plan.steps = this.planForm(parsedIntent.params, context);
        break;

      case 'SOCIAL':
        plan.steps = this.planSocial(parsedIntent.params, context);
        break;

      case 'LOOP':
        plan.steps = this.planLoop(parsedIntent.params, context);
        break;

      case 'TAB':
        plan.steps = this.planTab(parsedIntent.params, context);
        break;

      default:
        plan.steps = [{ action: 'error', message: 'Unknown intent', status: 'pending' }];
    }

    // Add metadata to each step
    plan.steps = plan.steps.map((step, index) => ({
      ...step,
      id: `${plan.id}_step_${index}`,
      index,
      status: 'pending',
      result: null,
      error: null,
      startTime: null,
      endTime: null
    }));

    this.activePlan = plan;
    return plan;
  }

  /**
   * Plan scraping steps
   */
  planScraping(params, context) {
    const steps = [];

    // Ensure page is loaded
    steps.push({
      action: 'waitForPageLoad',
      timeout: 5000,
      description: 'Wait for page to be ready'
    });

    // Detect data structures if no specific selector
    if (!params.selector && !params.pattern) {
      steps.push({
        action: 'detectStructures',
        description: 'Analyze page structure for data patterns'
      });
    }

    // Extract data based on type
    if (params.entityType?.pattern) {
      steps.push({
        action: 'extractByPattern',
        pattern: params.entityType.pattern.source,
        flags: params.entityType.pattern.flags,
        description: `Extract ${params.target?.type || 'data'} using pattern`
      });
    } else if (params.entityType?.selector) {
      steps.push({
        action: 'extractBySelector',
        selector: params.entityType.selector,
        description: `Extract ${params.target?.type || 'data'} using selector`
      });
    } else {
      steps.push({
        action: 'autoScrape',
        target: params.target,
        description: 'Automatically detect and extract data'
      });
    }

    // Normalize and format results
    steps.push({
      action: 'normalizeData',
      description: 'Clean and format extracted data'
    });

    return steps;
  }

  /**
   * Plan click steps
   */
  planClick(params, context) {
    const steps = [];

    // Find the element
    steps.push({
      action: 'findElement',
      descriptor: params.element,
      text: params.target,
      description: `Find ${params.target || 'element'}`
    });

    // Scroll into view
    steps.push({
      action: 'scrollIntoView',
      useResult: true,
      description: 'Scroll element into view'
    });

    // Wait for element to be clickable
    steps.push({
      action: 'waitForClickable',
      useResult: true,
      timeout: 5000,
      description: 'Wait for element to be interactive'
    });

    // Perform click
    steps.push({
      action: 'click',
      useResult: true,
      humanize: true,
      description: `Click ${params.target || 'element'}`
    });

    // Optional: wait for navigation/response
    steps.push({
      action: 'waitForSettled',
      timeout: 3000,
      description: 'Wait for page to settle',
      optional: true
    });

    return steps;
  }

  /**
   * Plan typing steps
   */
  planTyping(params, context) {
    const steps = [];

    // Find the input element
    steps.push({
      action: 'findElement',
      descriptor: params.element,
      text: params.target,
      description: `Find input: ${params.target || 'field'}`
    });

    // Focus the element
    steps.push({
      action: 'focus',
      useResult: true,
      description: 'Focus the input field'
    });

    // Clear existing content if needed
    steps.push({
      action: 'clearInput',
      useResult: true,
      description: 'Clear existing content',
      optional: true
    });

    // Type the text
    steps.push({
      action: 'type',
      useResult: true,
      text: params.text,
      humanize: true,
      charDelay: { min: 30, max: 100 },
      description: `Type: "${params.text?.substring(0, 30)}${params.text?.length > 30 ? '...' : ''}"`
    });

    return steps;
  }

  /**
   * Plan navigation steps
   */
  planNavigation(params, context) {
    const steps = [];

    if (params.newTab) {
      steps.push({
        action: 'openTab',
        url: params.url,
        description: `Open ${params.url} in new tab`
      });
    } else {
      steps.push({
        action: 'navigate',
        url: params.url,
        description: `Navigate to ${params.url}`
      });
    }

    // Wait for page load
    steps.push({
      action: 'waitForPageLoad',
      timeout: 30000,
      description: 'Wait for page to load'
    });

    return steps;
  }

  /**
   * Plan wait steps
   */
  planWait(params, context) {
    const steps = [];

    if (params.duration) {
      steps.push({
        action: 'delay',
        duration: params.duration,
        description: `Wait ${params.duration}ms`
      });
    } else if (params.condition) {
      steps.push({
        action: 'waitForElement',
        descriptor: params.element,
        text: params.condition,
        timeout: 30000,
        description: `Wait for: ${params.condition}`
      });
    }

    return steps;
  }

  /**
   * Plan workflow steps
   */
  planWorkflow(params, context) {
    const steps = [];

    switch (params.action) {
      case 'record':
        steps.push({
          action: 'startRecording',
          description: 'Start recording actions'
        });
        break;

      case 'stop':
        steps.push({
          action: 'stopRecording',
          description: 'Stop recording'
        });
        steps.push({
          action: 'saveWorkflow',
          description: 'Save recorded workflow'
        });
        break;

      case 'run':
        steps.push({
          action: 'loadWorkflow',
          name: params.workflowName,
          description: `Load workflow: ${params.workflowName}`
        });
        steps.push({
          action: 'executeWorkflow',
          useResult: true,
          description: `Execute workflow: ${params.workflowName}`
        });
        break;

      case 'create':
        steps.push({
          action: 'createWorkflow',
          description: 'Create new workflow'
        });
        break;

      case 'list':
        steps.push({
          action: 'listWorkflows',
          description: 'List all workflows'
        });
        break;
    }

    return steps;
  }

  /**
   * Plan scroll steps
   */
  planScroll(params, context) {
    const steps = [];

    if (params.target) {
      // Scroll to element
      steps.push({
        action: 'findElement',
        text: params.target,
        description: `Find: ${params.target}`
      });
      steps.push({
        action: 'scrollIntoView',
        useResult: true,
        behavior: 'smooth',
        description: `Scroll to ${params.target}`
      });
    } else {
      // Directional scroll
      steps.push({
        action: 'scroll',
        direction: params.direction,
        description: `Scroll ${params.direction}`
      });
    }

    return steps;
  }

  /**
   * Plan form steps
   */
  planForm(params, context) {
    const steps = [];

    // Find the form
    steps.push({
      action: 'findElement',
      selector: 'form',
      description: 'Find form element'
    });

    switch (params.action) {
      case 'fill':
        // Analyze form fields
        steps.push({
          action: 'analyzeForm',
          useResult: true,
          description: 'Analyze form fields'
        });
        // Fill each field
        steps.push({
          action: 'autoFillForm',
          useResult: true,
          data: params.data,
          description: 'Fill form fields'
        });
        break;

      case 'submit':
        steps.push({
          action: 'submitForm',
          useResult: true,
          description: 'Submit the form'
        });
        break;

      case 'clear':
        steps.push({
          action: 'clearForm',
          useResult: true,
          description: 'Clear form fields'
        });
        break;
    }

    return steps;
  }

  /**
   * Plan social media steps
   */
  planSocial(params, context) {
    const steps = [];
    const platform = context.platform || 'GENERIC';

    // Navigate to target if URL provided
    if (params.target?.type === 'url') {
      steps.push({
        action: 'navigate',
        url: params.target.value,
        description: 'Navigate to profile/post'
      });
      steps.push({
        action: 'waitForPageLoad',
        timeout: 10000,
        description: 'Wait for page'
      });
    }

    // Platform-specific actions
    switch (params.action) {
      case 'connect':
        steps.push({
          action: 'findElement',
          selectors: this.getConnectSelectors(platform),
          description: 'Find connect/follow button'
        });
        steps.push({
          action: 'click',
          useResult: true,
          humanize: true,
          description: 'Click connect'
        });
        if (params.message) {
          steps.push({
            action: 'waitForElement',
            selector: '[name="message"], textarea',
            timeout: 3000,
            description: 'Wait for message input'
          });
          steps.push({
            action: 'type',
            text: params.message,
            humanize: true,
            description: 'Type connection message'
          });
          steps.push({
            action: 'findElement',
            text: 'Send',
            description: 'Find send button'
          });
          steps.push({
            action: 'click',
            useResult: true,
            description: 'Send message'
          });
        }
        break;

      case 'follow':
        steps.push({
          action: 'findElement',
          selectors: this.getFollowSelectors(platform),
          description: 'Find follow button'
        });
        steps.push({
          action: 'click',
          useResult: true,
          humanize: true,
          description: 'Click follow'
        });
        break;

      case 'like':
        steps.push({
          action: 'findElement',
          selectors: this.getLikeSelectors(platform),
          description: 'Find like button'
        });
        steps.push({
          action: 'click',
          useResult: true,
          humanize: true,
          description: 'Click like'
        });
        break;

      case 'comment':
        steps.push({
          action: 'findElement',
          selectors: this.getCommentSelectors(platform),
          description: 'Find comment input'
        });
        steps.push({
          action: 'click',
          useResult: true,
          description: 'Focus comment input'
        });
        if (params.message) {
          steps.push({
            action: 'type',
            text: params.message,
            humanize: true,
            description: 'Type comment'
          });
          steps.push({
            action: 'findElement',
            text: 'Post|Submit|Send|Comment',
            description: 'Find post button'
          });
          steps.push({
            action: 'click',
            useResult: true,
            description: 'Post comment'
          });
        }
        break;

      case 'message':
        steps.push({
          action: 'findElement',
          selectors: this.getMessageSelectors(platform),
          description: 'Find message button'
        });
        steps.push({
          action: 'click',
          useResult: true,
          description: 'Open message dialog'
        });
        if (params.message) {
          steps.push({
            action: 'waitForElement',
            selector: 'textarea, [role="textbox"]',
            timeout: 5000,
            description: 'Wait for message input'
          });
          steps.push({
            action: 'type',
            text: params.message,
            humanize: true,
            description: 'Type message'
          });
          steps.push({
            action: 'findElement',
            text: 'Send',
            description: 'Find send button'
          });
          steps.push({
            action: 'click',
            useResult: true,
            description: 'Send message'
          });
        }
        break;

      case 'share':
        steps.push({
          action: 'findElement',
          selectors: this.getShareSelectors(platform),
          description: 'Find share button'
        });
        steps.push({
          action: 'click',
          useResult: true,
          humanize: true,
          description: 'Click share'
        });
        break;
    }

    // Add delay between actions for rate limiting
    steps.push({
      action: 'delay',
      duration: { min: 1000, max: 3000 },
      description: 'Rate limit delay'
    });

    return steps;
  }

  /**
   * Plan loop steps
   */
  planLoop(params, context) {
    const steps = [];

    if (params.count) {
      steps.push({
        action: 'loop',
        count: params.count,
        body: params.action,
        description: `Repeat ${params.count} times`
      });
    } else if (params.collection) {
      steps.push({
        action: 'findElements',
        text: params.collection,
        description: `Find all: ${params.collection}`
      });
      steps.push({
        action: 'forEach',
        useResult: true,
        body: params.action,
        description: `For each item in ${params.collection}`
      });
    }

    return steps;
  }

  /**
   * Plan tab steps
   */
  planTab(params, context) {
    const steps = [];

    switch (params.action) {
      case 'new':
        steps.push({
          action: 'createTab',
          url: params.url || 'about:blank',
          description: 'Create new tab'
        });
        break;

      case 'close':
        steps.push({
          action: 'closeTab',
          description: 'Close current tab'
        });
        break;

      case 'switch':
        steps.push({
          action: 'switchTab',
          index: params.tabNumber,
          description: `Switch to tab ${params.tabNumber}`
        });
        break;

      case 'duplicate':
        steps.push({
          action: 'duplicateTab',
          description: 'Duplicate current tab'
        });
        break;
    }

    return steps;
  }

  // Platform-specific selector helpers
  getConnectSelectors(platform) {
    switch (platform) {
      case 'LINKEDIN':
        return ['button:contains("Connect")', '[aria-label*="Invite"]', '.pvs-profile-actions button'];
      case 'TWITTER':
        return ['[data-testid="follow"]', '[aria-label*="Follow"]'];
      default:
        return ['button:contains("Connect")', 'button:contains("Follow")', 'button:contains("Add")'];
    }
  }

  getFollowSelectors(platform) {
    switch (platform) {
      case 'LINKEDIN':
        return ['button:contains("Follow")', '[aria-label*="Follow"]'];
      case 'TWITTER':
        return ['[data-testid="follow"]', '[aria-label*="Follow"]'];
      case 'INSTAGRAM':
        return ['button:contains("Follow")', '[aria-label="Follow"]'];
      default:
        return ['button:contains("Follow")', '[aria-label*="Follow"]'];
    }
  }

  getLikeSelectors(platform) {
    switch (platform) {
      case 'LINKEDIN':
        return ['button[aria-label*="Like"]', '.reactions-react-button'];
      case 'TWITTER':
        return ['[data-testid="like"]', '[aria-label*="Like"]'];
      case 'INSTAGRAM':
        return ['[aria-label="Like"]', 'svg[aria-label="Like"]'];
      default:
        return ['button:contains("Like")', '[aria-label*="Like"]', '[data-testid="like"]'];
    }
  }

  getCommentSelectors(platform) {
    switch (platform) {
      case 'LINKEDIN':
        return ['button[aria-label*="Comment"]', '.comments-comment-box__form textarea'];
      case 'TWITTER':
        return ['[data-testid="reply"]', '[aria-label*="Reply"]'];
      case 'INSTAGRAM':
        return ['[aria-label="Add a comment"]', 'textarea[placeholder*="comment"]'];
      default:
        return ['textarea', '[role="textbox"]', 'input[type="text"]'];
    }
  }

  getMessageSelectors(platform) {
    switch (platform) {
      case 'LINKEDIN':
        return ['button:contains("Message")', '[aria-label*="Message"]'];
      case 'TWITTER':
        return ['[data-testid="sendDMFromProfile"]', '[aria-label*="Message"]'];
      case 'INSTAGRAM':
        return ['button:contains("Message")', '[aria-label="Message"]'];
      default:
        return ['button:contains("Message")', '[aria-label*="Message"]', '[data-testid*="message"]'];
    }
  }

  getShareSelectors(platform) {
    switch (platform) {
      case 'LINKEDIN':
        return ['button[aria-label*="Share"]', 'button:contains("Repost")'];
      case 'TWITTER':
        return ['[data-testid="retweet"]', '[aria-label*="Repost"]'];
      case 'INSTAGRAM':
        return ['[aria-label="Share"]', 'button svg[aria-label="Share"]'];
      default:
        return ['button:contains("Share")', '[aria-label*="Share"]', '[data-testid*="share"]'];
    }
  }

  /**
   * Execute a plan
   * @param {Object} plan - The execution plan
   * @param {Object} executors - Object containing step executor functions
   * @returns {Object} Execution result
   */
  async execute(plan, executors = {}) {
    plan.status = 'running';
    plan.startTime = Date.now();

    const context = {
      plan,
      variables: { ...plan.variables },
      lastResult: null,
      stepResults: []
    };

    try {
      for (const step of plan.steps) {
        // Check if plan was cancelled
        if (plan.status === 'cancelled') {
          break;
        }

        // Skip optional steps that failed before
        if (step.optional && step.status === 'skipped') {
          continue;
        }

        step.status = 'running';
        step.startTime = Date.now();

        try {
          // Get the executor for this action
          const executor = executors[step.action];
          if (!executor) {
            throw new Error(`No executor for action: ${step.action}`);
          }

          // Prepare step context
          const stepContext = {
            ...context,
            step,
            element: step.useResult ? context.lastResult : null
          };

          // Execute with timeout
          const result = await this.withTimeout(
            executor(step, stepContext),
            step.timeout || this.stepTimeout
          );

          step.result = result;
          step.status = 'completed';
          step.endTime = Date.now();

          // Store result for next step
          context.lastResult = result;
          context.stepResults.push({ stepId: step.id, result });

          // Emit progress event
          this.onStepComplete?.(step, plan);

        } catch (error) {
          step.error = error.message;
          step.status = step.optional ? 'skipped' : 'failed';
          step.endTime = Date.now();

          if (!step.optional) {
            plan.status = 'failed';
            plan.error = `Step ${step.index + 1} failed: ${error.message}`;
            break;
          }
        }
      }

      if (plan.status === 'running') {
        plan.status = 'completed';
      }

    } catch (error) {
      plan.status = 'failed';
      plan.error = error.message;
    }

    plan.endTime = Date.now();
    plan.duration = plan.endTime - plan.startTime;

    // Save to history
    this.executionHistory.push({
      planId: plan.id,
      intent: plan.intent,
      status: plan.status,
      duration: plan.duration,
      stepCount: plan.steps.length,
      completedSteps: plan.steps.filter(s => s.status === 'completed').length,
      timestamp: Date.now()
    });

    return plan;
  }

  /**
   * Cancel the active plan
   */
  cancel() {
    if (this.activePlan && this.activePlan.status === 'running') {
      this.activePlan.status = 'cancelled';
    }
  }

  /**
   * Get plan status
   */
  getStatus() {
    if (!this.activePlan) return null;

    return {
      id: this.activePlan.id,
      intent: this.activePlan.intent,
      status: this.activePlan.status,
      progress: this.getProgress(),
      currentStep: this.getCurrentStep(),
      error: this.activePlan.error
    };
  }

  /**
   * Get execution progress
   */
  getProgress() {
    if (!this.activePlan) return 0;

    const completed = this.activePlan.steps.filter(s =>
      s.status === 'completed' || s.status === 'skipped'
    ).length;

    return Math.round((completed / this.activePlan.steps.length) * 100);
  }

  /**
   * Get current step
   */
  getCurrentStep() {
    if (!this.activePlan) return null;

    return this.activePlan.steps.find(s => s.status === 'running') || null;
  }

  /**
   * Helper: Execute with timeout
   */
  async withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Step timeout')), ms)
      )
    ]);
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set step complete callback
   */
  onProgress(callback) {
    this.onStepComplete = callback;
  }
}

// Create singleton
const taskPlanner = new TaskPlanner();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TaskPlanner, taskPlanner };
}
