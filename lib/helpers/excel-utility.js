import XLSX from 'xlsx';

// Function to import data from an Excel buffer
export const importExcel = (buffer) => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert the sheet data to JSON
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    return jsonData;
  } catch (error) {
    console.error('Error importing Excel file:', error.message);
    throw error;
  }
};

// Function to export data to an Excel buffer
export const exportExcel = (data) => {
  try {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Write the buffer to be sent in the response
    return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  } catch (error) {
    console.error('Error exporting to Excel file:', error.message);
    throw error;
  }
};
