// --- Start of Starfield Animation Script ---
const canvas = document.getElementById('starfield-canvas');
const ctx = canvas.getContext('2d');
let stars = [];
const numStars = 200;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function createStars() {
    stars = [];
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5,
            speed: Math.random() * 0.1,
        });
    }
}

function animateStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';

    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });

    requestAnimationFrame(animateStars);
}

window.addEventListener('resize', () => {
    resizeCanvas();
    createStars();
});

resizeCanvas();
createStars();
animateStars();
// --- End of Starfield Animation Script ---

// --- Start of Application Logic ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('csv-file');
const uploadForm = document.getElementById('upload-form');
const loadSampleButton = document.getElementById('load-sample-data');
const dropZoneText = document.getElementById('drop-zone-text');
const fileInfo = document.getElementById('file-info');
const fileNameSpan = document.getElementById('file-name');
const clearFileButton = document.getElementById('clear-file');
let myCharts = {};

function updateDropZoneUI(file) {
    if (file) {
        dropZoneText.style.display = 'none';
        fileInfo.style.display = 'block';
        fileNameSpan.textContent = file.name;
    } else {
        dropZoneText.style.display = 'block';
        fileInfo.style.display = 'none';
        fileNameSpan.textContent = '';
        fileInput.value = '';
    }
}

function handleFile(file) {
    if (file) {
        updateDropZoneUI(file);
        const formData = new FormData();
        formData.append('file', file);
        
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').innerHTML = '';
        document.getElementById('column-mapping').style.display = 'none';

        uploadFileToBackend(formData);
    }
}

dropZone.addEventListener('click', (e) => {
    if (!e.target.closest('#clear-file')) {
        fileInput.click();
    }
});

clearFileButton.addEventListener('click', (e) => {
    e.stopPropagation();
    updateDropZoneUI(null);
    document.getElementById('results').innerHTML = '';
    document.getElementById('column-mapping').style.display = 'none';
    for (const chartId in myCharts) {
        if (myCharts[chartId]) {
            myCharts[chartId].destroy();
        }
    }
    myCharts = {};
});

fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

loadSampleButton.addEventListener('click', async (e) => {
    e.preventDefault();
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').innerHTML = '';
    document.getElementById('column-mapping').style.display = 'none';
    try {
        const response = await fetch('/static/sample_data.csv');
        if (!response.ok) {
            throw new Error('Failed to load sample data.');
        }
        const blob = await response.blob();
        const file = new File([blob], 'sample_data.csv', { type: 'text/csv' });
        handleFile(file);
    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('results').innerHTML = `<div class="alert alert-danger mt-3" role="alert">An error occurred: ${error.message}</div>`;
    }
});

uploadForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    const file = fileInput.files[0];
    if (!file) {
        document.getElementById('results').innerHTML = '<div class="alert alert-danger mt-3" role="alert">Please select or drop a CSV file to upload.</div>';
        return;
    }
    const formData = new FormData();
    formData.append('file', file);
    uploadFileToBackend(formData);
});

async function uploadFileToBackend(formData) {
    try {
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const data = await response.json();
        document.getElementById('loading').style.display = 'none';
        if (response.ok) {
            const requiredFields = {
                'customer_id_col': 'Customer ID',
                'quantity_col': 'Quantity',
                'unit_price_col': 'Unit Price',
                'invoice_date_col': 'Invoice Date',
                'description_col': 'Product Description',
                'country_col': 'Country',
                'invoiceno_col': 'InvoiceNo'
            };
            const mappingFieldsContainer = document.getElementById('column-mapping-fields');
            mappingFieldsContainer.innerHTML = '';
            for (const [id, label] of Object.entries(requiredFields)) {
                const colDiv = document.createElement('div');
                colDiv.className = 'col-md-6 mb-2';
                colDiv.innerHTML = `<label for="${id}" class="form-label">${label}</label><select class="form-select" id="${id}"></select>`;
                mappingFieldsContainer.appendChild(colDiv);
                const selectElement = document.getElementById(id);
                selectElement.innerHTML = '<option value="">Select a column</option>';
                data.columns.forEach(col => {
                    const option = document.createElement('option');
                    option.value = col;
                    option.textContent = col;
                    if (col.toLowerCase() === label.toLowerCase().replace(/ /g, '') || (col.toLowerCase() === 'invoiceno' && label === 'InvoiceNo')) {
                        option.selected = true;
                    }
                    selectElement.appendChild(option);
                });
            }
            document.getElementById('column-mapping').style.display = 'block';
            document.getElementById('analysis-form').dataset.filename = data.filename;
        } else {
            document.getElementById('results').innerHTML = `<div class="alert alert-danger mt-3" role="alert">Error: ${data.error}</div>`;
        }
    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('results').innerHTML = `<div class="alert alert-danger mt-3" role="alert">An error occurred: ${error.message}</div>`;
    }
}

document.getElementById('analysis-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').innerHTML = '';
    const filename = this.dataset.filename;
    const requiredFields = {
        'customer_id_col': 'Customer ID',
        'quantity_col': 'Quantity',
        'unit_price_col': 'Unit Price',
        'invoice_date_col': 'Invoice Date',
        'description_col': 'Product Description',
        'country_col': 'Country',
        'invoiceno_col': 'InvoiceNo'
    };
    const column_map = {};
    for (const id in requiredFields) {
        const selectElement = document.getElementById(id);
        if (selectElement) {
            column_map[id] = selectElement.value;
        }
    }

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, column_map })
        });
        const data = await response.json();
        document.getElementById('loading').style.display = 'none';
        if (response.ok) {
            if (data.error) {
                document.getElementById('results').innerHTML = `<div class="alert alert-danger mt-3" role="alert">Error: ${data.error}</div>`;
                return;
            }

            for (const chartId in myCharts) {
                if (myCharts[chartId]) {
                    myCharts[chartId].destroy();
                }
            }
            myCharts = {};

            let resultHtml = '';
            let keyMetricsHtml = '';
            if (data["Total Revenue"] && data["Total Transactions"] && data["Unique Customers"]) {
                const totalRevenue = data["Total Revenue"];
                const totalTransactions = data["Total Transactions"];
                const uniqueCustomers = data["Unique Customers"];
                let avgOrderValue = "N/A";
                if (totalRevenue !== "N/A" && totalTransactions !== "N/A" && parseFloat(totalTransactions) > 0) {
                    const rev = parseFloat(totalRevenue.replace(/[$,]/g, ''));
                    avgOrderValue = `$${(rev / totalTransactions).toFixed(2)}`;
                }
                keyMetricsHtml = `<h3 class="text-light text-center mt-4">Key Metrics</h3><div class="row text-light"><div class="col-md-3 mb-3"><div class="key-metric-card"><h5>Total Revenue</h5><div class="key-metric-value">${totalRevenue}</div></div></div><div class="col-md-3 mb-3"><div class="key-metric-card"><h5>Total Transactions</h5><div class="key-metric-value">${totalTransactions}</div></div></div><div class="col-md-3 mb-3"><div class="key-metric-card"><h5>Average Order Value</h5><div class="key-metric-value">${avgOrderValue}</div></div></div><div class="col-md-3 mb-3"><div class="key-metric-card"><h5>Unique Customers</h5><div class="key-metric-value">${uniqueCustomers}</div></div></div></div>`;
                resultHtml += keyMetricsHtml;
            }

            let chartsAndTablesHtml = '<div class="row mt-4">';
            
            if (data["Top Customers"] && data["Top Customers"].length > 0) {
                chartsAndTablesHtml += `<div class="col-md-6 mb-4"><h4 class="text-center text-light">Top 5 Customers by Revenue</h4><div class="chart-container"><canvas id="topCustomersChart"></canvas></div></div>`;
            }
            
            if (data["Monthly Sales Trends"] && data["Monthly Sales Trends"].length > 0) {
                chartsAndTablesHtml += `<div class="col-md-6 mb-4"><h4 class="text-center text-light">Monthly Sales Trends</h4><div class="chart-container"><canvas id="monthlySalesChart"></canvas></div></div>`;
            }
            
            if (data["Top Products"] && data["Top Products"].length > 0) {
                chartsAndTablesHtml += `<div class="col-md-6 mb-4"><h4 class="text-center text-light">Top 5 Products by Revenue</h4><div class="chart-container"><canvas id="topProductsChart"></canvas></div></div>`;
            }
            
            if (data["Sales by Country"] && data["Sales by Country"].length > 0) {
                chartsAndTablesHtml += `<div class="col-md-6 mb-4"><h4 class="text-center text-light">Sales by Country</h4><div class="chart-container"><canvas id="salesByCountryChart"></canvas></div></div>`;
            }
            
            if (data["Sales by Day"] && data["Sales by Day"].length > 0) {
                chartsAndTablesHtml += `<div class="col-md-6 mb-4"><h4 class="text-center text-light">Sales by Day of the Week</h4><div class="chart-container"><canvas id="salesByDayChart"></canvas></div></div>`;
            }
            
            if (data["Sales by Hour"] && data["Sales by Hour"].length > 0) {
                chartsAndTablesHtml += `<div class="col-md-6 mb-4"><h4 class="text-center text-light">Sales by Hour of the Day</h4><div class="chart-container"><canvas id="salesByHourChart"></canvas></div></div>`;
            }
            
            if (data["AOV by Month"] && data["AOV by Month"].length > 0) {
                chartsAndTablesHtml += `<div class="col-md-6 mb-4"><h4 class="text-center text-light">Average Order Value by Month</h4><div class="chart-container"><canvas id="aovByMonthChart"></canvas></div></div>`;
            }
            
            if (data["Sales and AOV by Month"] && data["Sales and AOV by Month"].length > 0) {
                chartsAndTablesHtml += `<div class="col-md-6 mb-4"><h4 class="text-center text-light">Sales and AOV by Month</h4><div class="chart-container"><canvas id="salesAndAovByMonthChart"></canvas></div></div>`;
            }
            
            chartsAndTablesHtml += '</div>';

            if (keyMetricsHtml || chartsAndTablesHtml) {
                document.getElementById('results').innerHTML = resultHtml + chartsAndTablesHtml;
            } else {
                document.getElementById('results').innerHTML = `<div class="alert alert-info mt-3" role="alert">No analysis results could be generated. Please check your data and column mappings.</div>`;
            }
            
            if (data["Top Customers"] && data["Top Customers"].length > 0) {
                const customerLabels = data["Top Customers"].map(item => item.customer_id);
                const customerRevenue = data["Top Customers"].map(item => item.total_revenue);
                const customerCtx = document.getElementById('topCustomersChart').getContext('2d');
                myCharts.topCustomersChart = new Chart(customerCtx, {
                    type: 'bar',
                    data: {
                        labels: customerLabels,
                        datasets: [{
                            label: 'Total Revenue',
                            data: customerRevenue,
                            backgroundColor: 'rgba(75, 192, 192, 0.5)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
                });
            }

            if (data["Monthly Sales Trends"] && data["Monthly Sales Trends"].length > 0) {
                const monthlyLabels = data["Monthly Sales Trends"].map(item => item.month);
                const monthlySales = data["Monthly Sales Trends"].map(item => item.sales);
                const monthlyCtx = document.getElementById('monthlySalesChart').getContext('2d');
                myCharts.monthlySalesChart = new Chart(monthlyCtx, {
                    type: 'line',
                    data: {
                        labels: monthlyLabels,
                        datasets: [{
                            label: 'Monthly Sales',
                            data: monthlySales,
                            fill: false,
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }

            if (data["Top Products"] && data["Top Products"].length > 0) {
                const productLabels = data["Top Products"].map(item => item.product);
                const productSales = data["Top Products"].map(item => item.total_sales);
                const productCtx = document.getElementById('topProductsChart').getContext('2d');
                myCharts.topProductsChart = new Chart(productCtx, {
                    type: 'bar',
                    data: {
                        labels: productLabels,
                        datasets: [{
                            label: 'Total Sales by Product',
                            data: productSales,
                            backgroundColor: 'rgba(54, 162, 235, 0.5)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
                });
            }

            if (data["Sales by Country"] && data["Sales by Country"].length > 0) {
                const countryLabels = data["Sales by Country"].map(item => item.country);
                const countrySales = data["Sales by Country"].map(item => item.total_sales);
                const countryCtx = document.getElementById('salesByCountryChart').getContext('2d');
                myCharts.salesByCountryChart = new Chart(countryCtx, {
                    type: 'bar',
                    data: {
                        labels: countryLabels,
                        datasets: [{
                            label: 'Sales by Country',
                            data: countrySales,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
                });
            }

            if (data["Sales by Day"] && data["Sales by Day"].length > 0) {
                const dayLabels = data["Sales by Day"].map(item => item.day);
                const daySales = data["Sales by Day"].map(item => item.sales);
                const dayCtx = document.getElementById('salesByDayChart').getContext('2d');
                myCharts.salesByDayChart = new Chart(dayCtx, {
                    type: 'bar',
                    data: {
                        labels: dayLabels,
                        datasets: [{
                            label: 'Sales by Day of the Week',
                            data: daySales,
                            backgroundColor: 'rgba(153, 102, 255, 0.5)',
                            borderColor: 'rgba(153, 102, 255, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }

            if (data["Sales by Hour"] && data["Sales by Hour"].length > 0) {
                const hourLabels = data["Sales by Hour"].map(item => item.hour);
                const hourSales = data["Sales by Hour"].map(item => item.sales);
                const hourCtx = document.getElementById('salesByHourChart').getContext('2d');
                myCharts.salesByHourChart = new Chart(hourCtx, {
                    type: 'bar',
                    data: {
                        labels: hourLabels,
                        datasets: [{
                            label: 'Sales by Hour of the Day',
                            data: hourSales,
                            backgroundColor: 'rgba(255, 159, 64, 0.5)',
                            borderColor: 'rgba(255, 159, 64, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }

            if (data["AOV by Month"] && data["AOV by Month"].length > 0) {
                const aovLabels = data["AOV by Month"].map(item => item.month);
                const aovValues = data["AOV by Month"].map(item => item.aov);
                const aovCtx = document.getElementById('aovByMonthChart').getContext('2d');
                myCharts.aovByMonthChart = new Chart(aovCtx, {
                    type: 'line',
                    data: {
                        labels: aovLabels,
                        datasets: [{
                            label: 'Average Order Value',
                            data: aovValues,
                            fill: false,
                            borderColor: 'rgb(255, 206, 86)',
                            tension: 0.1
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }

            if (data["Sales and AOV by Month"] && data["Sales and AOV by Month"].length > 0) {
                const monthlyLabels = data["Sales and AOV by Month"].map(item => item.month);
                const monthlySales = data["Sales and AOV by Month"].map(item => item.monthly_sales);
                const monthlyAOV = data["Sales and AOV by Month"].map(item => item.aov);

                const monthlyCombinedCtx = document.getElementById('salesAndAovByMonthChart').getContext('2d');
                myCharts.salesAndAovByMonthChart = new Chart(monthlyCombinedCtx, {
                    type: 'line',
                    data: {
                        labels: monthlyLabels,
                        datasets: [
                            {
                                label: 'Monthly Sales',
                                data: monthlySales,
                                fill: false,
                                borderColor: 'rgb(75, 192, 192)',
                                tension: 0.1,
                                yAxisID: 'y'
                            },
                            {
                                label: 'Average Order Value',
                                data: monthlyAOV,
                                fill: false,
                                borderColor: 'rgb(255, 206, 86)',
                                tension: 0.1,
                                yAxisID: 'y1'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            mode: 'index',
                            intersect: false,
                        },
                        scales: {
                            y: {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                title: {
                                    display: true,
                                    text: 'Monthly Sales'
                                }
                            },
                            y1: {
                                type: 'linear',
                                display: true,
                                position: 'right',
                                title: {
                                    display: true,
                                    text: 'Average Order Value'
                                },
                                grid: {
                                    drawOnChartArea: false,
                                },
                            }
                        }
                    }
                });
            }
        } else {
            document.getElementById('results').innerHTML = `<div class="alert alert-danger mt-3" role="alert">Error: ${data.error}</div>`;
        }
    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('results').innerHTML = `<div class="alert alert-danger mt-3" role="alert">An error occurred: ${error.message}</div>`;
    }
});