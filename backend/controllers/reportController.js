const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const Sales = require("../models/Sales");
const ApiData = require("../models/ApiData");
const KPI = require("../models/KPI");
const Data = require("../models/Data");

// Export all data to PDF
exports.exportPDF = async (req, res) => {
  try {
    // Fetch all data
    const [salesData, apiData, kpiData, csvData] = await Promise.all([
      Sales.find().sort({ date: -1 }).limit(100),
      ApiData.find().sort({ fetchedAt: -1 }).limit(100),
      KPI.find().sort({ createdAt: -1 }),
      Data.find().sort({ uploadedAt: -1 }).limit(100),
    ]);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=analytics-report-${new Date().toISOString().split("T")[0]}.pdf`
    );

    // Pipe the PDF to response
    doc.pipe(res);

    // Title Page
    doc.fontSize(28).font("Helvetica-Bold").text("Analytics Dashboard Report", {
      align: "center",
    });
    doc.moveDown();
    doc.fontSize(12).font("Helvetica").text(`Generated: ${new Date().toLocaleString()}`, {
      align: "center",
    });
    doc.moveDown(2);

    // Summary Section
    doc.fontSize(16).font("Helvetica-Bold").text("Executive Summary");
    doc.moveDown();
    doc.fontSize(11).font("Helvetica");
    doc.text(`Total Sales Records: ${salesData.length}`);
    doc.text(`Total API Data Records: ${apiData.length}`);
    doc.text(`Total KPIs Tracked: ${kpiData.length}`);
    doc.text(`Total CSV Data Records: ${csvData.length}`);
    doc.moveDown(2);

    // Sales Data Section
    if (salesData.length > 0) {
      doc.addPage();
      doc.fontSize(18).font("Helvetica-Bold").text("Sales Data");
      doc.moveDown();

      const totalRevenue = salesData.reduce((sum, s) => sum + (s.revenue || 0), 0);
      doc.fontSize(12).font("Helvetica");
      doc.text(`Total Revenue: ₹${totalRevenue.toLocaleString()}`);
      doc.moveDown();

      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Recent Sales Records:");
      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica");

      salesData.slice(0, 20).forEach((sale, index) => {
        doc.text(
          `${index + 1}. ${sale.product || "N/A"} - ${sale.category || "N/A"} - ₹${
            sale.revenue || 0
          } (${sale.date ? new Date(sale.date).toLocaleDateString() : "N/A"})`
        );
      });
    }

    // API Data Section
    if (apiData.length > 0) {
      doc.addPage();
      doc.fontSize(18).font("Helvetica-Bold").text("API Data Records");
      doc.moveDown();

      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Recent API Data:");
      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica");

      apiData.slice(0, 20).forEach((item, index) => {
        doc.text(
          `${index + 1}. ${item.title || "N/A"} - Value: ${item.value || 0} (Batch: ${
            item.batchId || "N/A"
          })`
        );
      });
    }

    // KPI Section
    if (kpiData.length > 0) {
      doc.addPage();
      doc.fontSize(18).font("Helvetica-Bold").text("Key Performance Indicators");
      doc.moveDown();

      doc.fontSize(10).font("Helvetica");
      kpiData.forEach((kpi, index) => {
        doc.text(
          `${index + 1}. ${kpi.name || "N/A"} - ${kpi.value || 0} ${kpi.unit || ""} (Source: ${
            kpi.source || "N/A"
          })`
        );
        if (kpi.description) {
          doc.fontSize(8).text(`   Description: ${kpi.description}`, { indent: 20 });
          doc.fontSize(10);
        }
        doc.moveDown(0.3);
      });
    }

    // CSV Data Section
    if (csvData.length > 0) {
      doc.addPage();
      doc.fontSize(18).font("Helvetica-Bold").text("CSV Data Records");
      doc.moveDown();

      doc.fontSize(9).font("Helvetica");
      csvData.slice(0, 20).forEach((item, index) => {
        const dataStr = JSON.stringify(item.toObject()).substring(0, 100);
        doc.text(`${index + 1}. ${dataStr}...`);
      });
    }

    // Footer
    doc.fontSize(8).text("End of Report", { align: "center" });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: "Failed to generate PDF report" });
  }
};

// Export all data to Excel
exports.exportExcel = async (req, res) => {
  try {
    // Fetch all data
    const [salesData, apiData, kpiData, csvData] = await Promise.all([
      Sales.find().sort({ date: -1 }),
      ApiData.find().sort({ fetchedAt: -1 }),
      KPI.find().sort({ createdAt: -1 }),
      Data.find().sort({ uploadedAt: -1 }),
    ]);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Analytics Dashboard";
    workbook.created = new Date();

    // Sales Sheet
    const salesSheet = workbook.addWorksheet("Sales Data");
    salesSheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Product", key: "product", width: 25 },
      { header: "Category", key: "category", width: 20 },
      { header: "Quantity", key: "quantity", width: 12 },
      { header: "Revenue", key: "revenue", width: 15 },
    ];

    salesData.forEach((sale) => {
      salesSheet.addRow({
        date: sale.date ? new Date(sale.date).toLocaleDateString() : "N/A",
        product: sale.product || "N/A",
        category: sale.category || "N/A",
        quantity: sale.quantity || 0,
        revenue: sale.revenue || 0,
      });
    });

    // Style header row
    salesSheet.getRow(1).font = { bold: true };
    salesSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    salesSheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };

    // API Data Sheet
    const apiSheet = workbook.addWorksheet("API Data");
    apiSheet.columns = [
      { header: "Batch ID", key: "batchId", width: 30 },
      { header: "Title", key: "title", width: 30 },
      { header: "Value", key: "value", width: 15 },
      { header: "Fetched At", key: "fetchedAt", width: 20 },
    ];

    apiData.forEach((item) => {
      apiSheet.addRow({
        batchId: item.batchId || "N/A",
        title: item.title || "N/A",
        value: item.value || 0,
        fetchedAt: item.fetchedAt ? new Date(item.fetchedAt).toLocaleString() : "N/A",
      });
    });

    apiSheet.getRow(1).font = { bold: true };
    apiSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    apiSheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };

    // KPI Sheet
    const kpiSheet = workbook.addWorksheet("KPIs");
    kpiSheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Value", key: "value", width: 15 },
      { header: "Unit", key: "unit", width: 15 },
      { header: "Source", key: "source", width: 20 },
      { header: "Description", key: "description", width: 40 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];

    kpiData.forEach((kpi) => {
      kpiSheet.addRow({
        name: kpi.name || "N/A",
        value: kpi.value || 0,
        unit: kpi.unit || "",
        source: kpi.source || "N/A",
        description: kpi.description || "",
        createdAt: kpi.createdAt ? new Date(kpi.createdAt).toLocaleString() : "N/A",
      });
    });

    kpiSheet.getRow(1).font = { bold: true };
    kpiSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    kpiSheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };

    // CSV Data Sheet
    if (csvData.length > 0) {
      const csvSheet = workbook.addWorksheet("CSV Data");
      
      // Dynamically get columns from first record
      const firstRecord = csvData[0].toObject();
      const columns = Object.keys(firstRecord)
        .filter(key => !key.startsWith('_') && key !== '__v')
        .map(key => ({
          header: key.charAt(0).toUpperCase() + key.slice(1),
          key: key,
          width: 20
        }));
      
      csvSheet.columns = columns;

      csvData.forEach((item) => {
        const obj = item.toObject();
        const row = {};
        columns.forEach(col => {
          row[col.key] = obj[col.key] || "";
        });
        csvSheet.addRow(row);
      });

      csvSheet.getRow(1).font = { bold: true };
      csvSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      csvSheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
    }

    // Summary Sheet
    const summarySheet = workbook.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 1 }] });
    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 30 },
      { header: "Value", key: "value", width: 20 },
    ];

    summarySheet.addRow({ metric: "Report Generated", value: new Date().toLocaleString() });
    summarySheet.addRow({ metric: "Total Sales Records", value: salesData.length });
    summarySheet.addRow({ metric: "Total API Data Records", value: apiData.length });
    summarySheet.addRow({ metric: "Total KPIs", value: kpiData.length });
    summarySheet.addRow({ metric: "Total CSV Data Records", value: csvData.length });
    summarySheet.addRow({
      metric: "Total Sales Revenue",
      value: `₹${salesData.reduce((sum, s) => sum + (s.revenue || 0), 0).toLocaleString()}`,
    });

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF70AD47" },
    };
    summarySheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=analytics-report-${new Date().toISOString().split("T")[0]}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({ error: "Failed to generate Excel report" });
  }
};
