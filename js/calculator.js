/**
 * 仓位&风控管理计算器核心计算引擎
 * 根据技术架构文档实现所有计算公式
 */

class PositionCalculator {
    constructor() {
        this.inputs = {
            totalFunds: 0,        // 账户总资金
            rValue: 0,           // R值(%)
            profitLossRatio: 0,  // 盈亏比(1:N)
            lotDefinition: 0,    // 手数定义(1:X)
            nominalLeverage: 0,  // 名义杠杆
            openPrice: 0         // 开仓价格
        };
        this.results = {};
    }

    /**
     * 更新输入参数
     * @param {Object} newInputs - 新的输入参数
     */
    updateInputs(newInputs) {
        this.inputs = { ...this.inputs, ...newInputs };
    }

    /**
     * 验证输入参数是否有效
     * @returns {Object} 验证结果
     */
    validateInputs() {
        const errors = [];
        const { totalFunds, rValue, profitLossRatio, lotDefinition, nominalLeverage, openPrice } = this.inputs;

        if (!totalFunds || totalFunds <= 0) {
            errors.push('账户总资金必须大于0');
        }
        if (!rValue || rValue <= 0 || rValue > 100) {
            errors.push('R值必须在0-100之间');
        }
        if (!profitLossRatio || profitLossRatio <= 0) {
            errors.push('盈亏比必须大于0');
        }
        if (!lotDefinition || lotDefinition <= 0) {
            errors.push('手数定义必须大于0');
        }
        if (!nominalLeverage || nominalLeverage <= 0) {
            errors.push('名义杠杆必须大于0');
        }
        if (!openPrice || openPrice <= 0) {
            errors.push('开仓价格必须大于0');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 执行核心计算
     * @returns {Object} 计算结果
     */
    calculate() {
        const validation = this.validateInputs();
        if (!validation.isValid) {
            return {
                success: false,
                errors: validation.errors
            };
        }

        const {
            totalFunds,
            rValue,
            profitLossRatio,
            lotDefinition,
            nominalLeverage,
            openPrice
        } = this.inputs;

        try {
            // 基础计算
            const openMargin = totalFunds * (rValue / 100);
            const actualLeverage = (openMargin * nominalLeverage) / totalFunds;
            const openQuantity = (openMargin * nominalLeverage) / (openPrice * lotDefinition);

            // 止盈止损空间计算
            const profitSpace = (openMargin * profitLossRatio) / (openQuantity * lotDefinition);
            const lossSpace = openMargin / (openQuantity * lotDefinition);

            // 做多计算
            const longLiquidationSpace = (openPrice - (openPrice * (1 - 1/actualLeverage))) * 0.9;
            const longProfitPrice = openPrice + profitSpace;
            const longLossPrice = openPrice - lossSpace;
            const longProfitAmount = openQuantity * profitSpace * lotDefinition;
            const longLossAmount = openQuantity * lossSpace * lotDefinition;

            // 做空计算
            const shortLiquidationSpace = openPrice * (1/actualLeverage) * 0.8;
            const shortProfitPrice = openPrice - profitSpace;
            const shortLossPrice = openPrice + lossSpace;
            const shortProfitAmount = openQuantity * profitSpace * lotDefinition;
            const shortLossAmount = openQuantity * lossSpace * lotDefinition;

            this.results = {
                // 基础结果
                openMargin: this.formatNumber(openMargin, 2),
                actualLeverage: this.formatNumber(actualLeverage, 2),
                openQuantity: this.formatNumber(openQuantity, 2),
                
                // 做多结果
                longLiquidationSpace: this.formatNumber(longLiquidationSpace, 2),
                longProfitSpace: this.formatNumber(profitSpace, 2),
                longLossSpace: this.formatNumber(lossSpace, 2),
                longProfitPrice: this.formatNumber(longProfitPrice, 2),
                longLossPrice: this.formatNumber(longLossPrice, 2),
                longProfitAmount: this.formatNumber(longProfitAmount, 2),
                longLossAmount: this.formatNumber(longLossAmount, 2),
                
                // 做空结果
                shortLiquidationSpace: this.formatNumber(shortLiquidationSpace, 2),
                shortProfitSpace: this.formatNumber(profitSpace, 2),
                shortLossSpace: this.formatNumber(lossSpace, 2),
                shortProfitPrice: this.formatNumber(shortProfitPrice, 2),
                shortLossPrice: this.formatNumber(shortLossPrice, 2),
                shortProfitAmount: this.formatNumber(shortProfitAmount, 2),
                shortLossAmount: this.formatNumber(shortLossAmount, 2)
            };

            return {
                success: true,
                results: this.results
            };

        } catch (error) {
            return {
                success: false,
                errors: ['计算过程中发生错误: ' + error.message]
            };
        }
    }

    /**
     * 格式化数字显示
     * @param {number} value - 要格式化的数值
     * @param {number} decimals - 小数位数
     * @returns {number} 格式化后的数值
     */
    formatNumber(value, decimals = 2) {
        if (isNaN(value) || !isFinite(value)) {
            return 0;
        }
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    /**
     * 格式化货币显示
     * @param {number} value - 要格式化的数值
     * @returns {string} 格式化后的货币字符串
     */
    formatCurrency(value) {
        if (isNaN(value) || !isFinite(value)) {
            return '$ 0.00';
        }
        return '$ ' + value.toFixed(2);
    }

    /**
     * 格式化杠杆显示
     * @param {number} value - 要格式化的数值
     * @returns {string} 格式化后的杠杆字符串
     */
    formatLeverage(value) {
        if (isNaN(value) || !isFinite(value)) {
            return '0 x';
        }
        return value.toFixed(2) + ' x';
    }

    /**
     * 格式化手数显示
     * @param {number} value - 要格式化的数值
     * @returns {string} 格式化后的手数字符串
     */
    formatLots(value) {
        if (isNaN(value) || !isFinite(value)) {
            return '0.00 手';
        }
        // 对于很小的数值，显示更多小数位
        if (value < 0.01) {
            return value.toFixed(6) + ' 手';
        }
        return value.toFixed(2) + ' 手';
    }

    /**
     * 获取当前计算结果
     * @returns {Object} 当前的计算结果
     */
    getResults() {
        return this.results;
    }

    /**
     * 重置计算器
     */
    reset() {
        this.inputs = {
            totalFunds: 0,
            rValue: 0,
            profitLossRatio: 0,
            lotDefinition: 0,
            nominalLeverage: 0,
            openPrice: 0
        };
        this.results = {};
    }
}

// 导出计算器类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PositionCalculator;
} else {
    window.PositionCalculator = PositionCalculator;
}