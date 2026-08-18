import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, Calendar } from 'lucide-react';
import api from '../../lib/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';

export default function WorkerReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));

  const fetchMyData = async () => {
    const { data } = await api.get('/worker/dashboard');
    return data.recent.filter(record => record.date.startsWith(month));
  };

  const exportExcel = async () => {
    setLoading(true);
    try {
      const data = await fetchMyData();
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('My Attendance');

      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Check-In', key: 'checkIn', width: 15 },
        { header: 'Location', key: 'location', width: 25 },
        { header: 'Distance', key: 'distance', width: 15 },
        { header: 'Status', key: 'status', width: 15 }
      ];

      data.forEach(record => {
        worksheet.addRow({
          date: record.date,
          checkIn: record.checkInTime,
          location: record.location,
          distance: `${record.distance}m`,
          status: record.status
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `my_attendance_${month}.xlsx`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    setLoading(true);
    try {
      const data = await fetchMyData();
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text('Personal Attendance Report', 14, 20);
      doc.setFontSize(11);
      doc.text(`Employee: ${user.name}`, 14, 30);
      doc.text(`Month: ${month}`, 14, 37);

      const tableData = data.map(record => [
        record.date,
        record.checkInTime,
        record.location,
        `${record.distance}m`,
        record.status
      ]);

      doc.autoTable({
        startY: 45,
        head: [['Date', 'Time', 'Location', 'Distance', 'Status']],
        body: tableData,
        headStyles: { fillColor: [79, 70, 229] }
      });

      doc.save(`my_attendance_${month}.pdf`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Your Reports</h1>
        <p className="text-slate-400 mt-1">Download your personal attendance records</p>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-8 rounded-3xl shadow-xl space-y-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Select Month</label>
            <input 
              type="month" 
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50" 
            />
          </div>
          <div className="flex-1 text-slate-400 text-sm">
            Generate a report for the selected month including check-in times, locations, and status details.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={exportExcel}
            disabled={loading}
            className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white py-4 px-6 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <FileSpreadsheet size={24} />}
            Excel Report
          </button>
          <button
            onClick={exportPDF}
            disabled={loading}
            className="flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white py-4 px-6 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={24} />}
            PDF Report
          </button>
        </div>
      </div>

      <div className="bg-indigo-500/5 border border-indigo-500/10 p-6 rounded-2xl flex items-start gap-4">
        <Calendar className="text-indigo-400 shrink-0" size={24} />
        <p className="text-sm text-slate-400 leading-relaxed">
          Need a report for a specific date range or official documentation? Please contact your HR representative to request a custom report.
        </p>
      </div>
    </div>
  );
}
