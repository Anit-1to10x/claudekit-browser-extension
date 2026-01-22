/**
 * 10X.in Workflow Engine
 * Execute, manage, and persist workflows
 */

class WorkflowEngine {
  constructor() {
    this.workflows = new Map();
    this.activeWorkflow = null;
    this.executionContext = {};
    this.dbName = 'TenXWorkflows';
    this.dbVersion = 1;
    this.db = null;
  }

  /**
   * Initialize the workflow engine
   */
  async initialize() {
    await this.initDatabase();
    await this.loadWorkflows();
    console.log('[WorkflowEngine] Initialized');
  }

  /**
   * Initialize IndexedDB
   */
  initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Workflows store
        if (!db.objectStoreNames.contains('workflows')) {
          const workflowStore = db.createObjectStore('workflows', { keyPath: 'id' });
          workflowStore.createIndex('name', 'name', { unique: false });
          workflowStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Execution history store
        if (!db.objectStoreNames.contains('executions')) {
          const executionStore = db.createObjectStore('executions', { keyPath: 'id' });
          executionStore.createIndex('workflowId', 'workflowId', { unique: false });
          executionStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Variables store
        if (!db.objectStoreNames.contains('variables')) {
          db.createObjectStore('variables', { keyPath: 'key' });
        }

        // Schedules store
        if (!db.objectStoreNames.contains('schedules')) {
          const scheduleStore = db.createObjectStore('schedules', { keyPath: 'id' });
          scheduleStore.createIndex('workflowId', 'workflowId', { unique: false });
        }
      };
    });
  }

  /**
   * Load all workflows from database
   */
  async loadWorkflows() {
    const workflows = await this.getAllFromStore('workflows');
    for (const workflow of workflows) {
      this.workflows.set(workflow.id, workflow);
    }
  }

  /**
   * Create a new workflow
   * @param {Object} config - Workflow configuration
   * @returns {Object} Created workflow
   */
  async createWorkflow(config) {
    const workflow = {
      id: this.generateId(),
      name: config.name || 'Untitled Workflow',
      description: config.description || '',
      steps: config.steps || [],
      variables: config.variables || [],
      triggers: config.triggers || [],
      settings: {
        timeout: config.timeout || 300000, // 5 minutes default
        retryOnError: config.retryOnError || false,
        maxRetries: config.maxRetries || 3,
        parallelExecution: config.parallelExecution || false,
        ...config.settings
      },
      statistics: {
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        avgDuration: 0,
        lastRun: null
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.saveToStore('workflows', workflow);
    this.workflows.set(workflow.id, workflow);

    return workflow;
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(id, updates) {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`);
    }

    const updated = {
      ...workflow,
      ...updates,
      updatedAt: Date.now()
    };

    await this.saveToStore('workflows', updated);
    this.workflows.set(id, updated);

    return updated;
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id) {
    await this.deleteFromStore('workflows', id);
    this.workflows.delete(id);
  }

  /**
   * Get a workflow by ID or name
   */
  getWorkflow(idOrName) {
    // Try by ID first
    if (this.workflows.has(idOrName)) {
      return this.workflows.get(idOrName);
    }

    // Try by name
    for (const workflow of this.workflows.values()) {
      if (workflow.name.toLowerCase() === idOrName.toLowerCase()) {
        return workflow;
      }
    }

    return null;
  }

  /**
   * Get all workflows
   */
  getAllWorkflows() {
    return Array.from(this.workflows.values());
  }

  /**
   * Execute a workflow
   * @param {string} idOrName - Workflow ID or name
   * @param {Object} inputVariables - Variables to inject
   * @param {Object} executors - Step executor functions
   * @returns {Object} Execution result
   */
  async execute(idOrName, inputVariables = {}, executors = {}) {
    const workflow = this.getWorkflow(idOrName);
    if (!workflow) {
      throw new Error(`Workflow not found: ${idOrName}`);
    }

    const execution = {
      id: this.generateId(),
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: 'running',
      variables: { ...inputVariables },
      stepResults: [],
      startTime: Date.now(),
      endTime: null,
      error: null
    };

    this.activeWorkflow = execution;
    this.executionContext = {
      workflow,
      execution,
      variables: execution.variables,
      lastResult: null
    };

    try {
      // Execute each step
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];

        // Check for cancellation
        if (execution.status === 'cancelled') {
          break;
        }

        const stepResult = await this.executeStep(step, i, executors);
        execution.stepResults.push(stepResult);

        if (stepResult.status === 'failed' && !step.optional) {
          if (workflow.settings.retryOnError && stepResult.retries < workflow.settings.maxRetries) {
            // Retry the step
            i--; // Go back to retry
            stepResult.retries = (stepResult.retries || 0) + 1;
            await this.delay(1000 * stepResult.retries); // Exponential backoff
            continue;
          }

          execution.status = 'failed';
          execution.error = stepResult.error;
          break;
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
      }

    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
    }

    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;

    // Update workflow statistics
    await this.updateStatistics(workflow.id, execution);

    // Save execution history
    await this.saveToStore('executions', execution);

    this.activeWorkflow = null;

    return execution;
  }

  /**
   * Execute a single step
   */
  async executeStep(step, index, executors) {
    const result = {
      stepIndex: index,
      action: step.action,
      status: 'running',
      result: null,
      error: null,
      startTime: Date.now(),
      endTime: null
    };

    try {
      // Handle special step types
      switch (step.action) {
        case 'condition':
          result.result = await this.handleCondition(step);
          break;

        case 'loop':
          result.result = await this.handleLoop(step, executors);
          break;

        case 'forEach':
          result.result = await this.handleForEach(step, executors);
          break;

        case 'setVariable':
          this.executionContext.variables[step.variableName] = this.resolveValue(step.value);
          result.result = { variable: step.variableName, value: this.executionContext.variables[step.variableName] };
          break;

        case 'wait':
          await this.delay(this.resolveValue(step.duration));
          result.result = { waited: step.duration };
          break;

        case 'parallel':
          result.result = await this.handleParallel(step, executors);
          break;

        default:
          // Execute using provided executor
          const executor = executors[step.action];
          if (!executor) {
            throw new Error(`No executor for action: ${step.action}`);
          }

          const resolvedParams = this.resolveParams(step.params || step);
          result.result = await this.withTimeout(
            executor(resolvedParams, this.executionContext),
            step.timeout || 30000
          );

          // Store result for next steps
          this.executionContext.lastResult = result.result;
      }

      result.status = 'completed';

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
    }

    result.endTime = Date.now();
    result.duration = result.endTime - result.startTime;

    return result;
  }

  /**
   * Handle conditional step
   */
  async handleCondition(step) {
    const condition = this.evaluateCondition(step.condition);

    if (condition) {
      return { branch: 'then', condition: step.condition };
    } else if (step.else) {
      return { branch: 'else', condition: step.condition };
    }

    return { branch: 'none', condition: step.condition };
  }

  /**
   * Evaluate a condition string
   */
  evaluateCondition(condition) {
    // Replace variables
    let resolved = this.resolveValue(condition);

    // Simple condition evaluation
    if (typeof resolved === 'boolean') return resolved;
    if (typeof resolved === 'string') {
      // Check for comparison operators
      const comparisons = [
        { op: '===', fn: (a, b) => a === b },
        { op: '!==', fn: (a, b) => a !== b },
        { op: '>=', fn: (a, b) => Number(a) >= Number(b) },
        { op: '<=', fn: (a, b) => Number(a) <= Number(b) },
        { op: '>', fn: (a, b) => Number(a) > Number(b) },
        { op: '<', fn: (a, b) => Number(a) < Number(b) },
        { op: '==', fn: (a, b) => a == b },
        { op: '!=', fn: (a, b) => a != b },
        { op: 'contains', fn: (a, b) => String(a).includes(String(b)) },
        { op: 'startsWith', fn: (a, b) => String(a).startsWith(String(b)) },
        { op: 'endsWith', fn: (a, b) => String(a).endsWith(String(b)) }
      ];

      for (const { op, fn } of comparisons) {
        if (resolved.includes(op)) {
          const [left, right] = resolved.split(op).map(s => s.trim());
          return fn(this.resolveValue(left), this.resolveValue(right));
        }
      }

      // Truthy check
      return Boolean(resolved && resolved !== 'false' && resolved !== '0');
    }

    return Boolean(resolved);
  }

  /**
   * Handle loop step
   */
  async handleLoop(step, executors) {
    const results = [];
    const count = this.resolveValue(step.count);

    for (let i = 0; i < count; i++) {
      this.executionContext.variables['_index'] = i;
      this.executionContext.variables['_iteration'] = i + 1;

      for (const bodyStep of step.body || []) {
        const result = await this.executeStep(bodyStep, i, executors);
        results.push(result);

        if (result.status === 'failed' && !bodyStep.optional) {
          return { iterations: i, results, error: result.error };
        }
      }

      // Check for break condition
      if (step.breakCondition && this.evaluateCondition(step.breakCondition)) {
        break;
      }

      // Delay between iterations
      if (step.delay) {
        await this.delay(this.resolveValue(step.delay));
      }
    }

    return { iterations: count, results };
  }

  /**
   * Handle forEach step
   */
  async handleForEach(step, executors) {
    const results = [];
    const collection = this.resolveValue(step.collection);

    if (!Array.isArray(collection)) {
      throw new Error('forEach requires an array collection');
    }

    for (let i = 0; i < collection.length; i++) {
      const item = collection[i];
      this.executionContext.variables['_item'] = item;
      this.executionContext.variables['_index'] = i;
      this.executionContext.variables[step.itemVariable || 'item'] = item;

      for (const bodyStep of step.body || []) {
        const result = await this.executeStep(bodyStep, i, executors);
        results.push(result);

        if (result.status === 'failed' && !bodyStep.optional) {
          return { processed: i, total: collection.length, results, error: result.error };
        }
      }

      // Delay between items
      if (step.delay) {
        await this.delay(this.resolveValue(step.delay));
      }
    }

    return { processed: collection.length, total: collection.length, results };
  }

  /**
   * Handle parallel execution
   */
  async handleParallel(step, executors) {
    const promises = (step.steps || []).map((subStep, i) =>
      this.executeStep(subStep, i, executors)
    );

    const results = await Promise.all(promises);
    const failed = results.filter(r => r.status === 'failed');

    return {
      total: results.length,
      completed: results.filter(r => r.status === 'completed').length,
      failed: failed.length,
      results,
      errors: failed.map(f => f.error)
    };
  }

  /**
   * Resolve variable references in a value
   */
  resolveValue(value) {
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') {
      // Replace {{variable}} patterns
      return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        if (varName === 'lastResult') {
          return JSON.stringify(this.executionContext.lastResult);
        }
        return this.executionContext.variables[varName] ?? match;
      });
    }

    if (Array.isArray(value)) {
      return value.map(v => this.resolveValue(v));
    }

    if (typeof value === 'object') {
      const resolved = {};
      for (const [k, v] of Object.entries(value)) {
        resolved[k] = this.resolveValue(v);
      }
      return resolved;
    }

    return value;
  }

  /**
   * Resolve all params in a step
   */
  resolveParams(params) {
    return this.resolveValue(params);
  }

  /**
   * Update workflow statistics
   */
  async updateStatistics(workflowId, execution) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    const stats = workflow.statistics;
    stats.runCount++;

    if (execution.status === 'completed') {
      stats.successCount++;
    } else {
      stats.failureCount++;
    }

    stats.avgDuration = (
      (stats.avgDuration * (stats.runCount - 1) + execution.duration) /
      stats.runCount
    );
    stats.lastRun = execution.startTime;

    await this.saveToStore('workflows', workflow);
  }

  /**
   * Cancel the active workflow
   */
  cancel() {
    if (this.activeWorkflow) {
      this.activeWorkflow.status = 'cancelled';
    }
  }

  /**
   * Get execution history for a workflow
   */
  async getExecutionHistory(workflowId, limit = 20) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['executions'], 'readonly');
      const store = transaction.objectStore('executions');
      const index = store.index('workflowId');
      const request = index.getAll(workflowId);

      request.onsuccess = () => {
        const results = request.result
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get or set a persistent variable
   */
  async getVariable(key) {
    const result = await this.getFromStore('variables', key);
    return result?.value;
  }

  async setVariable(key, value) {
    await this.saveToStore('variables', { key, value, updatedAt: Date.now() });
  }

  async deleteVariable(key) {
    await this.deleteFromStore('variables', key);
  }

  // ========== Database Helpers ==========

  saveToStore(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  getFromStore(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  deleteFromStore(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ========== Utility Methods ==========

  generateId() {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  delay(ms) {
    const duration = typeof ms === 'object' ? this.randomBetween(ms.min, ms.max) : ms;
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Step timeout')), ms)
      )
    ]);
  }

  /**
   * Export workflow to JSON
   */
  exportWorkflow(idOrName) {
    const workflow = this.getWorkflow(idOrName);
    if (!workflow) return null;

    return JSON.stringify(workflow, null, 2);
  }

  /**
   * Import workflow from JSON
   */
  async importWorkflow(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;

    // Generate new ID to avoid conflicts
    data.id = this.generateId();
    data.createdAt = Date.now();
    data.updatedAt = Date.now();
    data.statistics = {
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      avgDuration: 0,
      lastRun: null
    };

    return this.createWorkflow(data);
  }

  /**
   * Clone a workflow
   */
  async cloneWorkflow(idOrName, newName) {
    const original = this.getWorkflow(idOrName);
    if (!original) {
      throw new Error(`Workflow not found: ${idOrName}`);
    }

    const clone = { ...original };
    delete clone.id;
    clone.name = newName || `${original.name} (Copy)`;

    return this.createWorkflow(clone);
  }
}

// Create singleton
const workflowEngine = new WorkflowEngine();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WorkflowEngine, workflowEngine };
}
