/**
 * 仓位&风控管理计算器应用主逻辑
 * 处理用户交互和实时计算
 */

class CalculatorApp {
    constructor() {
        this.calculator = new PositionCalculator();
        this.inputElements = {};
        this.resultElements = {};
        this.debounceTimer = null;
        this.isCalculating = false;
        
        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        this.initElements();
        this.initEventListeners();
        this.loadSavedData();
        this.performInitialCalculation();
    }

    /**
     * 初始化DOM元素引用
     */
    initElements() {
        // 输入元素
        this.inputElements = {
            totalFunds: document.getElementById('totalFunds'),
            rValue: document.getElementById('rValue'),
            profitLossRatio: document.getElementById('profitLossRatio'),
            lotDefinition: document.getElementById('lotDefinition'),
            nominalLeverage: document.getElementById('nominalLeverage'),
            openPrice: document.getElementById('openPrice')
        };

        // 结果显示元素
        this.resultElements = {
            // 基础结果
            openMargin: document.getElementById('openMargin'),
            actualLeverage: document.getElementById('actualLeverage'),
            openQuantity: document.getElementById('openQuantity'),
            
            // 做多结果
            longLiquidationSpace: document.getElementById('longLiquidationSpace'),
            longProfitSpace: document.getElementById('longProfitSpace'),
            longLossSpace: document.getElementById('longLossSpace'),
            longProfitPrice: document.getElementById('longProfitPrice'),
            longLossPrice: document.getElementById('longLossPrice'),
            longProfitAmount: document.getElementById('longProfitAmount'),
            longLossAmount: document.getElementById('longLossAmount'),
            
            // 做空结果
            shortLiquidationSpace: document.getElementById('shortLiquidationSpace'),
            shortProfitSpace: document.getElementById('shortProfitSpace'),
            shortLossSpace: document.getElementById('shortLossSpace'),
            shortProfitPrice: document.getElementById('shortProfitPrice'),
            shortLossPrice: document.getElementById('shortLossPrice'),
            shortProfitAmount: document.getElementById('shortProfitAmount'),
            shortLossAmount: document.getElementById('shortLossAmount')
        };
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 为所有输入框添加实时计算监听
        Object.values(this.inputElements).forEach(input => {
            if (input) {
                input.addEventListener('input', this.handleInputChange.bind(this));
                input.addEventListener('blur', this.handleInputBlur.bind(this));
                input.addEventListener('focus', this.handleInputFocus.bind(this));
            }
        });

        // 页面可见性变化监听（用于保存数据）
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // 页面卸载前保存数据
        window.addEventListener('beforeunload', this.saveData.bind(this));
    }

    /**
     * 处理输入变化事件
     * @param {Event} event - 输入事件
     */
    handleInputChange(event) {
        const input = event.target;
        
        // 清除错误状态
        this.clearInputError(input);
        
        // 防抖处理，避免频繁计算
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            this.collectInputsAndCalculate();
            this.saveData();
        }, 300);
    }

    /**
     * 处理输入框失焦事件
     * @param {Event} event - 失焦事件
     */
    handleInputBlur(event) {
        const input = event.target;
        const value = parseFloat(input.value);
        
        // 验证输入值
        if (input.value && (isNaN(value) || value < 0)) {
            this.showInputError(input, '请输入有效的正数');
        }
    }

    /**
     * 处理输入框聚焦事件
     * @param {Event} event - 聚焦事件
     */
    handleInputFocus(event) {
        const input = event.target;
        this.clearInputError(input);
    }

    /**
     * 处理页面可见性变化
     */
    handleVisibilityChange() {
        if (document.hidden) {
            this.saveData();
        }
    }

    /**
     * 收集输入数据并执行计算
     */
    collectInputsAndCalculate() {
        if (this.isCalculating) {
            return;
        }
        
        this.isCalculating = true;
        
        // 收集输入数据
        const inputs = {};
        let hasValidInput = false;
        
        Object.keys(this.inputElements).forEach(key => {
            const element = this.inputElements[key];
            if (element && element.value) {
                const value = parseFloat(element.value);
                if (!isNaN(value) && value > 0) {
                    inputs[key] = value;
                    hasValidInput = true;
                }
            }
        });
        
        // 如果有有效输入，则进行计算
        if (hasValidInput) {
            this.calculator.updateInputs(inputs);
            const result = this.calculator.calculate();
            
            if (result.success) {
                this.updateDisplay(result.results);
                this.clearAllErrors();
            } else {
                this.showCalculationErrors(result.errors);
            }
        } else {
            this.resetDisplay();
        }
        
        this.isCalculating = false;
    }

    /**
     * 更新结果显示
     * @param {Object} results - 计算结果
     */
    updateDisplay(results) {
        // 添加更新动画效果
        Object.keys(this.resultElements).forEach(key => {
            const element = this.resultElements[key];
            if (element && results[key] !== undefined) {
                element.classList.add('updating');
                
                setTimeout(() => {
                    // 根据不同类型格式化显示
                    if (key === 'openMargin' || key.includes('Amount') || key.includes('Price') || key.includes('Space')) {
                        element.textContent = this.calculator.formatCurrency(results[key]);
                    } else if (key === 'actualLeverage') {
                        element.textContent = this.calculator.formatLeverage(results[key]);
                    } else if (key === 'openQuantity') {
                        element.textContent = this.calculator.formatLots(results[key]);
                    } else {
                        element.textContent = this.calculator.formatCurrency(results[key]);
                    }
                    
                    element.classList.remove('updating');
                }, 150);
            }
        });
    }

    /**
     * 重置显示为默认值
     */
    resetDisplay() {
        // 所有结果都显示为 "--"
        Object.keys(this.resultElements).forEach(key => {
            const element = this.resultElements[key];
            if (element) {
                element.textContent = '--';
            }
        });
    }

    /**
     * 执行初始计算（不设置默认值）
     */
    performInitialCalculation() {
        // 不设置默认值，保持输入框为空
        // 初始化时显示 "--" 作为占位符
        this.resetDisplay();
    }

    /**
     * 显示输入错误
     * @param {HTMLElement} input - 输入元素
     * @param {string} message - 错误消息
     */
    showInputError(input, message) {
        input.classList.add('error');
        
        // 移除已存在的错误消息
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // 添加错误消息
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);
    }

    /**
     * 清除输入错误
     * @param {HTMLElement} input - 输入元素
     */
    clearInputError(input) {
        input.classList.remove('error');
        const errorMessage = input.parentNode.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    /**
     * 清除所有错误
     */
    clearAllErrors() {
        Object.values(this.inputElements).forEach(input => {
            if (input) {
                this.clearInputError(input);
            }
        });
    }

    /**
     * 显示计算错误
     * @param {Array} errors - 错误列表
     */
    showCalculationErrors(errors) {
        console.warn('计算错误:', errors);
        // 可以在这里添加更多的错误显示逻辑
    }

    /**
     * 保存数据到本地存储
     */
    saveData() {
        try {
            const data = {};
            Object.keys(this.inputElements).forEach(key => {
                const element = this.inputElements[key];
                if (element && element.value) {
                    data[key] = element.value;
                }
            });
            localStorage.setItem('calculatorData', JSON.stringify(data));
        } catch (error) {
            console.warn('保存数据失败:', error);
        }
    }

    /**
     * 从本地存储加载数据
     */
    loadSavedData() {
        try {
            const savedData = localStorage.getItem('calculatorData');
            if (savedData) {
                const data = JSON.parse(savedData);
                Object.keys(data).forEach(key => {
                    const element = this.inputElements[key];
                    if (element && data[key]) {
                        element.value = data[key];
                    }
                });
            }
        } catch (error) {
            console.warn('加载保存的数据失败:', error);
        }
    }

    /**
     * 清除所有数据
     */
    clearAllData() {
        Object.values(this.inputElements).forEach(input => {
            if (input) {
                input.value = '';
            }
        });
        this.resetDisplay();
        this.clearAllErrors();
        localStorage.removeItem('calculatorData');
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    window.calculatorApp = new CalculatorApp();
    console.log('仓位&风控管理计算器已启动');
});