/*jshint node:false, esversion: 6 */
"use strict";

// ========================================
// SOC Donut Chart Component
// ========================================
class SOCDonutChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.currentValue = 0;
        this.isCharging = false;
        this.init();
    }

    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Dimensions
        const width = 200;
        const height = 200;
        const radius = Math.min(width, height) / 2;
        const arcWidth = 20;

        // Create SVG
        this.svg = d3.select(`#${this.containerId}`)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('class', 'soc-donut-chart');

        // Create main group
        this.chartGroup = this.svg.append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        // Background arc
        const backgroundArc = d3.arc()
            .innerRadius(radius - arcWidth)
            .outerRadius(radius)
            .startAngle(0)
            .endAngle(2 * Math.PI);

        this.chartGroup.append('path')
            .attr('d', backgroundArc)
            .attr('class', 'soc-donut-background')
            .style('fill', '#2f3441')
            .style('opacity', 0.3);

        // Foreground arc (animated)
        this.arc = d3.arc()
            .innerRadius(radius - arcWidth)
            .outerRadius(radius)
            .startAngle(0);

        this.foregroundPath = this.chartGroup.append('path')
            .attr('class', 'soc-donut-foreground')
            .style('fill', 'url(#soc-gradient)');

        // Create gradient
        const defs = this.svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'soc-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#10b981')
            .attr('stop-opacity', 1);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#3b82f6')
            .attr('stop-opacity', 1);

        // Center text - percentage
        this.percentageText = this.chartGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.2em')
            .attr('class', 'soc-percentage')
            .style('font-size', '36px')
            .style('font-weight', '700')
            .style('fill', '#ffffff')
            .text('0%');

        // Center text - label
        this.labelText = this.chartGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '1.2em')
            .attr('class', 'soc-label')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .style('fill', '#8b92a7')
            .text('State of Charge');

        // Status icon
        this.statusIcon = this.chartGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '2.8em')
            .attr('class', 'soc-status-icon')
            .style('font-size', '18px')
            .style('opacity', 0)
            .text('⚡');
    }

    update(soc, isCharging = false, remainingAh = null) {
        if (!this.svg) return;

        // Store current end angle if not set
        if (this.currentEndAngle === undefined) {
            this.currentEndAngle = 0;
        }

        this.currentValue = soc;
        this.isCharging = isCharging;

        console.log('SOC Update:', soc, 'Charging:', isCharging, 'Remaining:', remainingAh);

        // Update percentage text
        this.percentageText
            .transition()
            .duration(500)
            .tween('text', () => {
                const currentText = this.percentageText.text();
                const currentValue = parseFloat(currentText) || 0;
                const interpolate = d3.interpolate(currentValue, soc);
                return (t) => {
                    this.percentageText.text(Math.round(interpolate(t)) + '%');
                };
            });

        // Update arc
        const endAngle = (soc / 100) * 2 * Math.PI;
        const startAngle = this.currentEndAngle;
        
        this.foregroundPath
            .transition()
            .duration(1000)
            .ease(d3.easeCubicOut)
            .attrTween('d', () => {
                const interpolate = d3.interpolate(startAngle, endAngle);
                return (t) => {
                    const angle = interpolate(t);
                    this.arc.endAngle(angle);
                    return this.arc();
                };
            });
        
        this.currentEndAngle = endAngle;

        // Update color based on SOC level
        let color1, color2;
        if (soc <= 20) {
            color1 = '#ef4444'; color2 = '#dc2626'; // Red
        } else if (soc <= 40) {
            color1 = '#f59e0b'; color2 = '#d97706'; // Orange
        } else if (soc <= 60) {
            color1 = '#eab308'; color2 = '#ca8a04'; // Yellow
        } else if (soc <= 80) {
            color1 = '#84cc16'; color2 = '#65a30d'; // Light green
        } else {
            color1 = '#10b981'; color2 = '#059669'; // Green
        }

        d3.select('#soc-gradient')
            .select('stop:first-child')
            .transition()
            .duration(500)
            .attr('stop-color', color1);

        d3.select('#soc-gradient')
            .select('stop:last-child')
            .transition()
            .duration(500)
            .attr('stop-color', color2);

        // Show/hide charging icon
        this.statusIcon
            .transition()
            .duration(300)
            .style('opacity', isCharging ? 1 : 0)
            .style('fill', isCharging ? '#3b82f6' : '#8b92a7');

        // Update label with remaining capacity if provided
        if (remainingAh !== null) {
            this.labelText.text(`${remainingAh.toFixed(1)} Ah`);
        }
    }
}

// ========================================
// Cell Voltage Bar Chart Component
// ========================================
class CellVoltageBarChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.cellCount = 0;
        this.svg = null;
        this.chartGroup = null;
        this.initialized = false;
        this.init();
    }

    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }
        container.innerHTML = '';
        this.container = container;
    }

    update(cellVoltages) {
        if (!this.container) return;
        if (!cellVoltages || cellVoltages.length === 0) return;

        const voltages = cellVoltages.map(mv => mv / 1000); // Convert mV to V
        const minV = Math.min(...voltages);
        const maxV = Math.max(...voltages);
        const diffV = maxV - minV;

        // Dynamic scale with padding
        const scaleMin = minV - 0.020;
        const scaleMax = maxV + 0.020;

        // Only rebuild if cell count changed or not initialized
        if (!this.initialized || this.cellCount !== voltages.length) {
            this.cellCount = voltages.length;
            this.initialized = true;
            this.buildChart(voltages, scaleMin, scaleMax, minV, maxV, diffV);
        } else {
            this.updateChart(voltages, scaleMin, scaleMax, minV, maxV, diffV);
        }
    }

    buildChart(voltages, scaleMin, scaleMax, minV, maxV, diffV) {
        // Clear and rebuild
        this.container.innerHTML = '';

        // Create SVG
        const margin = { top: 20, right: 100, bottom: 30, left: 60 };
        const width = this.container.clientWidth - margin.left - margin.right;
        const height = Math.max(300, voltages.length * 35);

        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .attr('class', 'cell-voltage-chart');

        this.chartGroup = this.svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        this.margin = margin;
        this.width = width;
        this.height = height;

        // X scale
        this.xScale = d3.scaleLinear()
            .domain([scaleMin, scaleMax])
            .range([0, width]);

        // Y scale
        this.yScale = d3.scaleBand()
            .domain(voltages.map((v, i) => `Cell ${i + 1}`))
            .range([0, height])
            .padding(0.2);

        // Add gridlines
        this.chartGroup.append('g')
            .attr('class', 'grid')
            .selectAll('line')
            .data(this.xScale.ticks(5))
            .enter()
            .append('line')
            .attr('x1', d => this.xScale(d))
            .attr('x2', d => this.xScale(d))
            .attr('y1', 0)
            .attr('y2', this.height)
            .style('stroke', '#2f3441')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '2,2');

        // Add bars
        const bars = this.chartGroup.selectAll('.cell-bar-group')
            .data(voltages)
            .enter()
            .append('g')
            .attr('class', 'cell-bar-group')
            .attr('transform', (d, i) => `translate(0, ${this.yScale(`Cell ${i + 1}`)})`);

        // Background bars (full scale)
        bars.append('rect')
            .attr('class', 'cell-bar-bg')
            .attr('x', this.xScale(scaleMin))
            .attr('y', 0)
            .attr('width', this.xScale(scaleMax) - this.xScale(scaleMin))
            .attr('height', this.yScale.bandwidth())
            .style('fill', '#1a1d29')
            .style('stroke', '#2f3441')
            .style('stroke-width', 1)
            .attr('rx', 4);

        // Voltage bars (animated)
        bars.append('rect')
            .attr('class', 'cell-bar-fill')
            .attr('x', this.xScale(scaleMin))
            .attr('y', 0)
            .attr('width', 0)
            .attr('height', this.yScale.bandwidth())
            .attr('rx', 4)
            .style('fill', (d, i) => {
                if (d === maxV) return '#10b981'; // Max - green
                if (d === minV && diffV > 0.020) return '#f59e0b'; // Min - orange if imbalanced
                return '#3b82f6'; // Others - blue
            })
            .style('opacity', 0.8)
            .transition()
            .duration(1000)
            .ease(d3.easeCubicOut)
            .attr('width', d => this.xScale(d) - this.xScale(scaleMin));

        // Cell labels
        bars.append('text')
            .attr('class', 'cell-label')
            .attr('x', -10)
            .attr('y', this.yScale.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .style('fill', '#b4b9c8')
            .text((d, i) => `Cell ${i + 1}`);

        // Voltage labels
        bars.append('text')
            .attr('class', 'cell-value')
            .attr('x', d => this.xScale(d) + 5)
            .attr('y', this.yScale.bandwidth() / 2)
            .attr('dy', '0.35em')
            .style('font-size', '13px')
            .style('font-weight', '600')
            .style('fill', '#ffffff')
            .text(d => `${d.toFixed(3)}V`);

        // Indicators for max/min
        const xScale = this.xScale; // for closure
        const yScale = this.yScale; // for closure
        bars.each(function(d, i) {
            if (d === maxV) {
                d3.select(this).append('text')
                    .attr('class', 'cell-indicator')
                    .attr('x', xScale(d) + 60)
                    .attr('y', yScale.bandwidth() / 2)
                    .attr('dy', '0.35em')
                    .style('font-size', '12px')
                    .style('font-weight', '600')
                    .style('fill', '#10b981')
                    .text('⭐ MAX');
            }
            if (d === minV && diffV > 0.020) {
                d3.select(this).append('text')
                    .attr('class', 'cell-indicator')
                    .attr('x', xScale(d) + 60)
                    .attr('y', yScale.bandwidth() / 2)
                    .attr('dy', '0.35em')
                    .style('font-size', '12px')
                    .style('font-weight', '600')
                    .style('fill', '#f59e0b')
                    .text('⚠ MIN');
            }
        });

        // X axis
        const xAxis = d3.axisBottom(this.xScale)
            .ticks(5)
            .tickFormat(d => `${d.toFixed(3)}V`);

        this.chartGroup.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${this.height})`)
            .call(xAxis)
            .style('color', '#8b92a7')
            .style('font-size', '11px');

        // Balance status
        this.balanceStatus = this.chartGroup.append('text')
            .attr('class', 'balance-status')
            .attr('x', this.width / 2)
            .attr('y', this.height + 50)
            .attr('text-anchor', 'middle')
            .style('font-size', '13px')
            .style('font-weight', '600');

        this.updateBalanceStatus(diffV);
    }

    updateChart(voltages, scaleMin, scaleMax, minV, maxV, diffV) {
        // Update scales
        this.xScale.domain([scaleMin, scaleMax]);
        this.yScale.domain(voltages.map((v, i) => `Cell ${i + 1}`));

        // Update voltage bars
        const bars = this.chartGroup.selectAll('.cell-bar-group')
            .data(voltages);

        // Update fills
        bars.select('.cell-bar-fill')
            .transition()
            .duration(500)
            .ease(d3.easeCubicOut)
            .attr('width', d => this.xScale(d) - this.xScale(scaleMin))
            .style('fill', (d) => {
                if (d === maxV) return '#10b981';
                if (d === minV && diffV > 0.020) return '#f59e0b';
                return '#3b82f6';
            });

        // Update value labels
        bars.select('.cell-value')
            .transition()
            .duration(300)
            .attr('x', d => this.xScale(d) + 5)
            .text(d => `${d.toFixed(3)}V`);

        // Update indicators
        bars.selectAll('.cell-indicator').remove();
        const xScale = this.xScale;
        const yScale = this.yScale;
        bars.each(function(d) {
            if (d === maxV) {
                d3.select(this).append('text')
                    .attr('class', 'cell-indicator')
                    .attr('x', xScale(d) + 60)
                    .attr('y', yScale.bandwidth() / 2)
                    .attr('dy', '0.35em')
                    .style('font-size', '12px')
                    .style('font-weight', '600')
                    .style('fill', '#10b981')
                    .text('⭐ MAX');
            }
            if (d === minV && diffV > 0.020) {
                d3.select(this).append('text')
                    .attr('class', 'cell-indicator')
                    .attr('x', xScale(d) + 60)
                    .attr('y', yScale.bandwidth() / 2)
                    .attr('dy', '0.35em')
                    .style('font-size', '12px')
                    .style('font-weight', '600')
                    .style('fill', '#f59e0b')
                    .text('⚠ MIN');
            }
        });

        // Update balance status
        this.updateBalanceStatus(diffV);
    }

    updateBalanceStatus(diffV) {
        if (diffV <= 0.020) {
            this.balanceStatus
                .style('fill', '#10b981')
                .text('🟢 Balanced - All cells within 0.020V');
        } else if (diffV <= 0.050) {
            this.balanceStatus
                .style('fill', '#f59e0b')
                .text('🟡 Slight imbalance - ' + diffV.toFixed(3) + 'V difference');
        } else {
            this.balanceStatus
                .style('fill', '#ef4444')
                .text('🔴 Imbalanced - ' + diffV.toFixed(3) + 'V difference');
        }
    }
}

// ========================================
// Temperature Bar Gauge Component
// ========================================
class TemperatureBarGauge {
    constructor(containerId) {
        this.containerId = containerId;
        this.initialized = false;
        this.sensorCount = 0;
        this.init();
    }

    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }
        container.innerHTML = '';
        this.container = container;
    }

    getTemperatureColor(temp) {
        if (temp < 0) return '#3b82f6';      // Blue - freezing
        if (temp < 15) return '#06b6d4';     // Cyan - cold
        if (temp < 25) return '#10b981';     // Green - optimal
        if (temp < 35) return '#eab308';     // Yellow - warm
        if (temp < 45) return '#f59e0b';     // Orange - hot
        return '#ef4444';                     // Red - critical
    }

    getTemperatureStatus(temp) {
        if (temp < 0) return '❄️ Freezing';
        if (temp < 15) return '🔵 Cold';
        if (temp < 25) return '🟢 Optimal';
        if (temp < 35) return '🟡 Warm';
        if (temp < 45) return '🟠 Hot';
        return '🔴 Critical';
    }

    update(temperatures, labels) {
        if (!this.container) return;
        if (!temperatures || temperatures.length === 0) return;

        const temps = temperatures;
        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...temps);
        
        // Default labels
        const defaultLabels = ['Board', 'Cell 0', 'Cell 1', 'Cell 2', 'Cell 3', 'Cell 4', 'Cell 5', 'Cell 6'];
        const tempLabels = labels || defaultLabels;

        // Only rebuild if sensor count changed or not initialized
        if (!this.initialized || this.sensorCount !== temps.length) {
            this.sensorCount = temps.length;
            this.initialized = true;
            this.buildGauges(temps, tempLabels, maxTemp);
        } else {
            this.updateGauges(temps, tempLabels, maxTemp);
        }
    }

    buildGauges(temps, tempLabels, maxTemp) {
        // Clear and rebuild
        this.container.innerHTML = '';

        // Create container div
        const tempContainer = d3.select(this.container)
            .append('div')
            .attr('class', 'temperature-gauges');

        // Header with max temp
        const header = tempContainer.append('div')
            .attr('class', 'temp-header')
            .style('margin-bottom', '15px')
            .style('text-align', 'right')
            .style('font-size', '12px')
            .style('color', '#8b92a7');

        const hottestIndex = temps.indexOf(maxTemp);
        header.html(`Highest: ${tempLabels[hottestIndex] || 'Sensor ' + hottestIndex} <span style="color: ${this.getTemperatureColor(maxTemp)}; font-weight: 600;">${maxTemp.toFixed(1)}°C</span>`);

        // Temperature scale
        const scaleMin = 0;
        const scaleMax = 50;

        // Create each temperature gauge
        temps.forEach((temp, i) => {
            const gaugeGroup = tempContainer.append('div')
                .attr('class', 'temp-gauge-row')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('margin-bottom', '10px')
                .style('opacity', 0);

            // Label
            gaugeGroup.append('div')
                .attr('class', 'temp-label')
                .style('width', '70px')
                .style('font-size', '12px')
                .style('font-weight', '500')
                .style('color', '#b4b9c8')
                .style('text-align', 'right')
                .style('padding-right', '10px')
                .text(tempLabels[i] || `Sensor ${i}`);

            // Bar container
            const barContainer = gaugeGroup.append('div')
                .attr('class', 'temp-bar-container')
                .style('flex', '1')
                .style('height', '24px')
                .style('background', '#1a1d29')
                .style('border-radius', '4px')
                .style('border', '1px solid #2f3441')
                .style('position', 'relative')
                .style('overflow', 'hidden');

            // Filled bar
            const percentage = Math.max(0, Math.min(100, (temp / scaleMax) * 100));
            barContainer.append('div')
                .attr('class', 'temp-bar-fill')
                .style('height', '100%')
                .style('width', '0%')
                .style('background', this.getTemperatureColor(temp))
                .style('border-radius', '3px')
                .style('transition', 'width 1s ease-out')
                .style('box-shadow', temp === maxTemp ? `0 0 10px ${this.getTemperatureColor(temp)}` : 'none');

            // Temperature value
            gaugeGroup.append('div')
                .attr('class', 'temp-value')
                .style('width', '60px')
                .style('text-align', 'right')
                .style('font-size', '13px')
                .style('font-weight', '600')
                .style('color', '#ffffff')
                .style('padding-left', '10px')
                .text(`${temp.toFixed(1)}°C`);

            // Status
            gaugeGroup.append('div')
                .attr('class', 'temp-status')
                .style('width', '90px')
                .style('text-align', 'left')
                .style('font-size', '11px')
                .style('font-weight', '500')
                .style('color', this.getTemperatureColor(temp))
                .style('padding-left', '10px')
                .text(this.getTemperatureStatus(temp));

            // Animate in
            setTimeout(() => {
                gaugeGroup.style('opacity', 1)
                    .style('transition', 'opacity 0.5s ease-out');
                
                gaugeGroup.select('.temp-bar-fill')
                    .style('width', `${percentage}%`);
            }, i * 50);
        });
        
        // Store reference
        this.tempContainer = tempContainer;
    }

    updateGauges(temps, tempLabels, maxTemp) {
        if (!this.tempContainer) return;

        const scaleMax = 50;
        
        // Update header
        const hottestIndex = temps.indexOf(maxTemp);
        this.tempContainer.select('.temp-header')
            .html(`Highest: ${tempLabels[hottestIndex] || 'Sensor ' + hottestIndex} <span style="color: ${this.getTemperatureColor(maxTemp)}; font-weight: 600;">${maxTemp.toFixed(1)}°C</span>`);

        // Update each gauge
        const gaugeRows = this.tempContainer.selectAll('.temp-gauge-row');
        gaugeRows.each((d, i, nodes) => {
            const gaugeGroup = d3.select(nodes[i]);
            const temp = temps[i];
            const percentage = Math.max(0, Math.min(100, (temp / scaleMax) * 100));

            // Update bar fill
            gaugeGroup.select('.temp-bar-fill')
                .style('width', `${percentage}%`)
                .style('background', this.getTemperatureColor(temp))
                .style('box-shadow', temp === maxTemp ? `0 0 10px ${this.getTemperatureColor(temp)}` : 'none')
                .style('transition', 'width 0.5s ease-out, background 0.3s ease');

            // Update temperature value
            gaugeGroup.select('.temp-value')
                .text(`${temp.toFixed(1)}°C`);

            // Update status
            gaugeGroup.select('.temp-status')
                .style('color', this.getTemperatureColor(temp))
                .text(this.getTemperatureStatus(temp));
        });
    }
}

// ========================================
// Semi-Circular Gauge Component
// ========================================
class SemiCircularGauge {
    constructor(containerId, config = {}) {
        this.containerId = containerId;
        this.config = {
            min: config.min || 0,
            max: config.max || 100,
            unit: config.unit || '',
            label: config.label || '',
            bidirectional: config.bidirectional || false,
            colorScale: config.colorScale || ((v) => '#3b82f6')
        };
        this.currentValue = 0;
        this.init();
    }

    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }

        container.innerHTML = '';

        const width = 180;
        const height = 140;
        const radius = 70;

        this.width = width;
        this.height = height;
        this.radius = radius;

        this.svg = d3.select(`#${this.containerId}`)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('class', 'semi-gauge-chart');

        this.chartGroup = this.svg.append('g')
            .attr('transform', `translate(${width / 2}, ${height - 30})`);

        // Background arc
        const backgroundArc = d3.arc()
            .innerRadius(radius - 15)
            .outerRadius(radius)
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2);

        this.chartGroup.append('path')
            .attr('d', backgroundArc)
            .attr('class', 'gauge-background-arc')
            .style('fill', '#2f3441')
            .style('opacity', 0.3);

        // Value arc
        this.valueArc = d3.arc()
            .innerRadius(radius - 15)
            .outerRadius(radius)
            .startAngle(-Math.PI / 2);

        this.valueArcPath = this.chartGroup.append('path')
            .attr('class', 'gauge-value-arc')
            .style('fill', '#3b82f6');

        // Needle
        // Initialize needle at minimum position (left side of semicircle)
        const minAngle = -Math.PI / 2;
        this.needle = this.chartGroup.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', Math.cos(minAngle) * (radius - 7))
            .attr('y2', Math.sin(minAngle) * (radius - 7))
            .style('stroke', '#ffffff')
            .style('stroke-width', 2)
            .style('stroke-linecap', 'round');

        // Center circle
        this.chartGroup.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 5)
            .style('fill', '#ffffff');

        // Value text
        this.valueText = this.chartGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '1.5em')
            .style('font-size', '20px')
            .style('font-weight', '700')
            .style('fill', '#ffffff')
            .text('0' + this.config.unit);

        // Label text
        this.labelText = this.chartGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '3em')
            .style('font-size', '11px')
            .style('fill', '#8b92a7')
            .text(this.config.label);

        // Min/Max labels
        this.minLabel = this.chartGroup.append('text')
            .attr('x', -(radius + 5))
            .attr('y', 5)
            .attr('text-anchor', 'end')
            .style('font-size', '10px')
            .style('fill', '#8b92a7')
            .text(this.config.min + this.config.unit);

        this.maxLabel = this.chartGroup.append('text')
            .attr('x', radius + 5)
            .attr('y', 5)
            .attr('text-anchor', 'start')
            .style('font-size', '10px')
            .style('fill', '#8b92a7')
            .text(this.config.max + this.config.unit);

        // Initialize current angle to min position
        this.currentGaugeAngle = -Math.PI / 2;
    }

    update(value, label = null) {
        if (!this.svg) return;

        this.currentValue = value;

        // Clamp value to range
        const clampedValue = Math.max(this.config.min, Math.min(this.config.max, value));

        // Calculate angle
        const range = this.config.max - this.config.min;
        const normalizedValue = (clampedValue - this.config.min) / range;
        const angle = -Math.PI / 2 + normalizedValue * Math.PI;

        // Update needle
        // The needle rotates in the semicircle. For SVG coordinates where y is positive downward:
        // - We use cos(angle) for x (standard)
        // - We use sin(angle) for y (NOT negated because the chart is at bottom)
        const needleLength = this.radius - 7;
        this.needle
            .transition()
            .duration(500)
            .ease(d3.easeCubicOut)
            .attr('x2', Math.cos(angle) * needleLength)
            .attr('y2', Math.sin(angle) * needleLength);

        // Update arc
        const startAngle = this.currentGaugeAngle;
        this.valueArcPath
            .transition()
            .duration(500)
            .ease(d3.easeCubicOut)
            .attrTween('d', () => {
                const interpolate = d3.interpolate(startAngle, angle);
                return (t) => {
                    const currentAngle = interpolate(t);
                    this.valueArc.endAngle(currentAngle);
                    return this.valueArc();
                };
            })
            .style('fill', this.config.colorScale(value));
        
        this.currentGaugeAngle = angle;

        // Update value text
        this.valueText
            .transition()
            .duration(500)
            .tween('text', () => {
                const interpolate = d3.interpolate(
                    parseFloat(this.valueText.text()) || 0,
                    value
                );
                return (t) => {
                    this.valueText.text(interpolate(t).toFixed(1) + this.config.unit);
                };
            });

        // Update label if provided
        if (label) {
            this.labelText.text(label);
        }
    }

    // Update the scale of the gauge dynamically
    updateScale(min, max) {
        this.config.min = min;
        this.config.max = max;

        // Update min/max labels
        this.minLabel
            .transition()
            .duration(300)
            .text(min + this.config.unit);

        this.maxLabel
            .transition()
            .duration(300)
            .text(max + this.config.unit);

        // Re-update the current value with new scale
        if (this.currentValue !== undefined) {
            this.update(this.currentValue);
        }
    }
}

// ========================================
// Capacity Progress Bar Component
// ========================================
class CapacityProgressBar {
    constructor(containerId) {
        this.containerId = containerId;
        this.init();
    }

    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }

        container.innerHTML = '';
        
        // Create structure
        const wrapper = d3.select(`#${this.containerId}`)
            .append('div')
            .attr('class', 'capacity-progress-wrapper');

        // Full capacity label
        this.fullCapacityLabel = wrapper.append('div')
            .attr('class', 'capacity-full-label')
            .style('font-size', '12px')
            .style('color', '#8b92a7')
            .style('margin-bottom', '8px')
            .text('Full: 0.0 Ah');

        // Progress bar container
        const progressContainer = wrapper.append('div')
            .attr('class', 'capacity-progress-container')
            .style('width', '100%')
            .style('height', '40px')
            .style('background', '#1a1d29')
            .style('border-radius', '8px')
            .style('border', '1px solid #2f3441')
            .style('position', 'relative')
            .style('overflow', 'hidden');

        // Progress bar fill with gradient
        const defs = wrapper.append('svg')
            .attr('width', 0)
            .attr('height', 0)
            .append('defs');

        const gradient = defs.append('linearGradient')
            .attr('id', 'capacity-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#3b82f6');

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#10b981');

        this.progressFill = progressContainer.append('div')
            .attr('class', 'capacity-progress-fill')
            .style('height', '100%')
            .style('width', '0%')
            .style('background', 'linear-gradient(90deg, #3b82f6, #10b981)')
            .style('border-radius', '7px')
            .style('transition', 'width 1s ease-out, background 0.5s ease')
            .style('box-shadow', '0 0 10px rgba(59, 130, 246, 0.5)');

        // Remaining capacity text (inside bar)
        this.remainingText = progressContainer.append('div')
            .attr('class', 'capacity-remaining-text')
            .style('position', 'absolute')
            .style('top', '50%')
            .style('left', '12px')
            .style('transform', 'translateY(-50%)')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .style('color', '#ffffff')
            .style('z-index', '10')
            .text('0.0 Ah (0%)');

        // Time estimate
        this.timeEstimate = wrapper.append('div')
            .attr('class', 'capacity-time-estimate')
            .style('font-size', '11px')
            .style('color', '#8b92a7')
            .style('margin-top', '8px')
            .style('font-style', 'italic')
            .text('');
    }

    update(remainingAh, fullCapacityAh, currentA = null) {
        if (!this.progressFill) return;

        const percentage = (remainingAh / fullCapacityAh) * 100;

        // Update labels
        this.fullCapacityLabel.text(`Full: ${fullCapacityAh.toFixed(1)} Ah`);
        this.remainingText.text(`${remainingAh.toFixed(1)} Ah (${percentage.toFixed(0)}%)`);

        // Update progress bar
        this.progressFill.style('width', `${percentage}%`);

        // Update gradient based on percentage
        let color1, color2;
        if (percentage <= 20) {
            color1 = '#ef4444'; color2 = '#dc2626';
        } else if (percentage <= 40) {
            color1 = '#f59e0b'; color2 = '#d97706';
        } else if (percentage <= 60) {
            color1 = '#eab308'; color2 = '#10b981';
        } else {
            color1 = '#3b82f6'; color2 = '#10b981';
        }

        this.progressFill.style('background', `linear-gradient(90deg, ${color1}, ${color2})`);

        // Calculate time estimate
        if (currentA && currentA !== 0) {
            const hours = Math.abs(remainingAh / currentA);
            if (hours < 100 && hours > 0) {
                const h = Math.floor(hours);
                const m = Math.floor((hours - h) * 60);
                const action = currentA < 0 ? 'runtime' : 'until full';
                this.timeEstimate.text(`Estimated ${action}: ${h}h ${m}m @ current rate`);
            } else {
                this.timeEstimate.text('');
            }
        } else {
            this.timeEstimate.text('Idle - no charge/discharge');
        }
    }
}

