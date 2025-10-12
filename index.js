/*jshint node:false */
"use strict";

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/lifepo4/worker.js', { scope: './', type: 'module' });
}


window.addEventListener("load", () => {
    const bleReader = new JDBBMSReader();
    const timeSeriesManager = new TimeSeriesManager(bleReader);

    // History view graphs
    const voltagesGraph = new VoltagesGraph();
    const cellVoltageGraph =  new CellVoltagesGraph();
    const currentGraph =  new CurrentGraph();
    const powerGraph =  new PowerGraph();
    const temperatureGraph =  new TemperatureGraph();
    const stateOfChargeGraph =  new StateOfChargeGraph();
    const chargeRemainingGraph =  new ChargeRemainingGraph();

    // Dashboard view charts
    const socDonutChart = new SOCDonutChart('socDonutChart');
    const cellVoltageBarChart = new CellVoltageBarChart('cellVoltageBarChart');
    const temperatureBarGauge = new TemperatureBarGauge('temperatureBarGauge');
    const capacityProgressBar = new CapacityProgressBar('capacityProgressBar');


    document.getElementById('connect').addEventListener("click", bleReader.connectBMS);
    document.getElementById('disconnect').addEventListener("click", bleReader.disconnectBMS);

    // Attempt to reconnect to previously authorized device
    bleReader.reconnectBMS().then((reconnected) => {
        if (reconnected) {
            console.log("Successfully reconnected to BMS");
        } else {
            console.log("No previous connection found, click Connect to pair");
        }
    });

    // View switching
    const dashboardView = document.getElementById('dashboardView');
    const historyView = document.getElementById('historyView');
    const viewBmsBtn = document.getElementById('viewBms');
    const viewHistoryBtn = document.getElementById('viewHistory');

    document.getElementById('viewBms').addEventListener("click", () => {
        dashboardView.classList.remove('hidden');
        historyView.classList.add('hidden');
        viewBmsBtn.classList.add('view-nav__btn--active');
        viewHistoryBtn.classList.remove('view-nav__btn--active');
    });

    document.getElementById('viewHistory').addEventListener("click", () => {
        dashboardView.classList.add('hidden');
        historyView.classList.remove('hidden');
        viewBmsBtn.classList.remove('view-nav__btn--active');
        viewHistoryBtn.classList.add('view-nav__btn--active');
    });


    const setInnerHtmlById = (id, value) => {
        const el = document.getElementById(id);
        if ( el ) {
            el.innerHTML = value;
        } else {
            console.log("ID Not found ",id)
        }
    };
    const setClass = (id, value, classOn, classOff) => {
        const el = document.getElementById(id);
        if ( el ) {
            const classes = el.getAttribute("class") || "";
            const classList  = classes.split(" ")
                .filter((className) => { return (className !== classOn && className != classOff); });
            classList.push(value?classOn:classOff);
            el.setAttribute("class",classList.join(" "));
        } else {
            console.log("ID Not found ",id)
        }
    };

    bleReader.on('connected', (connected) => {
        if ( connected ) {
            timeSeriesManager.start();
        } else {
            timeSeriesManager.stop();
        }
        setClass('connect',connected,'hidden','');
        setClass('disconnect',connected,'','hidden');
        
        // Update connection status badge
        const statusBadge = document.getElementById('connectionStatus');
        const statusText = statusBadge.querySelector('.status-badge__text');
        if (connected) {
            statusBadge.classList.add('status-badge--connected');
            statusText.textContent = 'Connected';
        } else {
            statusBadge.classList.remove('status-badge--connected');
            statusText.textContent = 'Disconnected';
        }
    });

    // Visual feedback helper function
    const addValueFlashEffect = (elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('value-flash');
            setTimeout(() => element.classList.remove('value-flash'), 300);
        }
    };

    bleReader.on("statusUpdate", (statusUpdate) => {
        // Update text displays
        setInnerHtmlById("status.voltage", statusUpdate.voltage.toFixed(2));
        addValueFlashEffect("status.voltage");
        
        // Update current display
        setInnerHtmlById("status.current", statusUpdate.current.toFixed(2));
        addValueFlashEffect("status.current");
        
        // Calculate and display power (V * A = W)
        const power = statusUpdate.voltage * statusUpdate.current;
        setInnerHtmlById("status.power", power.toFixed(2));
        addValueFlashEffect("status.power");
        
        // Update graphical charts
        // Determine actual charging/discharging state based on current flow
        // Positive current = charging, negative current = discharging
        const currentThreshold = 0.1; // 0.1A threshold to account for noise
        const isCharging = statusUpdate.current > currentThreshold;
        const isDischarging = statusUpdate.current < -currentThreshold;
        
        // Debug log to verify charging status is correct
        console.log(`Current: ${statusUpdate.current.toFixed(2)}A, Charging: ${isCharging}, Discharging: ${isDischarging}, FET Status: charge=${statusUpdate.FETStatus.charging} discharge=${statusUpdate.FETStatus.discharging}`);
        
        // Update SOC Donut Chart
        socDonutChart.update(
            statusUpdate.capacity.stateOfCharge,
            isCharging,
            statusUpdate.packBalCap
        );
        
        // Update Capacity Progress Bar
        capacityProgressBar.update(
            statusUpdate.packBalCap,
            statusUpdate.capacity.fullCapacity,
            statusUpdate.current
        );
        
        // Update Temperature Bar Gauge
        const tempLabels = ['Board', 'Cell 0', 'Cell 1', 'Cell 2', 'Cell 3', 'Cell 4', 'Cell 5', 'Cell 6'];
        temperatureBarGauge.update(statusUpdate.tempSensorValues, tempLabels);
        
        // Update charging/discharging indicators
        setClass("status.charging", isCharging, "status-indicator__badge--enabled", "status-indicator__badge--disabled");
        setClass("status.discharging", isDischarging, "status-indicator__badge--enabled", "status-indicator__badge--disabled");
        
        // Update BMS info
        setInnerHtmlById("status.chargeCycles", statusUpdate.chargeCycles);
        setInnerHtmlById("status.productionDate", statusUpdate.productionDate.toDateString());
        setInnerHtmlById("status.bmsSWVersion", statusUpdate.bmsSWVersion);
        setInnerHtmlById("status.numberOfCells", statusUpdate.numberOfCells.toFixed(0));
        setInnerHtmlById("status.tempSensorCount", statusUpdate.tempSensorCount.toFixed(0));
        setInnerHtmlById("status.chemistry", statusUpdate.chemistry);
        
        // Update protection status
        for (var k in statusUpdate.currentErrors) {
            setClass('status.errors.'+k, statusUpdate.currentErrors[k]==1, "protection-badge--enabled", "protection-badge--disabled");
        }
        
        // Format timestamp
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        setInnerHtmlById("status.lastUpdate", timeStr);
    });
    bleReader.on("cellUpdate", (cellUpdate) => {
        // Update Cell Voltage Bar Chart
        cellVoltageBarChart.update(cellUpdate.cellMv);
        
        // Calculate range and diff for header display
        var cellMax = Math.max(...cellUpdate.cellMv);
        var cellMin = Math.min(...cellUpdate.cellMv);
        const range = cellMax - cellMin;
        
        setInnerHtmlById('cell.range', `${(0.001*cellMin).toFixed(3)} - ${(0.001*cellMax).toFixed(3)}`);
        setInnerHtmlById('cell.diff', (0.001*range).toFixed(3));
        
        // Add visual feedback animation
        const rangeElement = document.getElementById('cell.range');
        const diffElement = document.getElementById('cell.diff');
        if (rangeElement) {
            rangeElement.classList.add('value-flash');
            setTimeout(() => rangeElement.classList.remove('value-flash'), 300);
        }
        if (diffElement) {
            diffElement.classList.add('value-flash');
            setTimeout(() => diffElement.classList.remove('value-flash'), 300);
        }
        
        // Format timestamp
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        setInnerHtmlById("status.lastUpdate", timeStr);
    });

    timeSeriesManager.timeSeries.on("update", (history) => {
        console.log("Update Graphs");
        voltagesGraph.update(history);
        cellVoltageGraph.update(history);
        currentGraph.update(history);
        powerGraph.update(history);
        temperatureGraph.update(history);
        stateOfChargeGraph.update(history);
        chargeRemainingGraph.update(history);
    });

        voltagesGraph.update(timeSeriesManager.timeSeries.history);
        cellVoltageGraph.update(timeSeriesManager.timeSeries.history);
        currentGraph.update(timeSeriesManager.timeSeries.history);
        powerGraph.update(timeSeriesManager.timeSeries.history);
        temperatureGraph.update(timeSeriesManager.timeSeries.history);
        stateOfChargeGraph.update(timeSeriesManager.timeSeries.history);
        chargeRemainingGraph.update(timeSeriesManager.timeSeries.history);


});



