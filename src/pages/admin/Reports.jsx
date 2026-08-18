import { useState } from 'react';
import { Calendar, Download, FileSpreadsheet, FileText, Loader2, Filter, Trophy, Flame } from 'lucide-react';
import api from '../../lib/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import TraineeLeaderboard from '../../components/TraineeLeaderboard';

export default function AdminReports() {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', department: '' });
  const [activeTab, setActiveTab] = useState('exports'); // 'exports' | 'leaderboard'

  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Design'];

  const fetchFilteredData = async () => {
    const { data } = await api.get('/admin/attendance');
    return data.filter(record => {
      const date = record.date;
      const start = filters.startDate;
      const end = filters.endDate;
      const dept = filters.department;
      
      const inDateRange = (!start || date >= start) && (!end || date <= end);
      const inDept = !dept || record.user?.department === dept;
      
      return inDateRange && inDept;
    });
  };

  const exportToExcel = async () => {
    setLoading(true);
    try {
      const data = await fetchFilteredData();
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Report');

      worksheet.columns = [
        { header: 'Employee', key: 'name', width: 25 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Check-In', key: 'checkIn', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Location', key: 'location', width: 25 }
      ];

      data.forEach(record => {
        worksheet.addRow({
          name: record.user?.name,
          department: record.user?.department,
          date: record.date,
          checkIn: record.checkInTime,
          status: record.status,
          location: record.location
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export failed', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    setLoading(true);
    try {
      const data = await fetchFilteredData();
      const doc = new jsPDF();
      
      doc.text('Attendance Report', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

      const tableData = data.map(record => [
        record.user?.name,
        record.user?.department,
        record.date,
        record.checkInTime,
        record.status,
        record.location
      ]);

      doc.autoTable({
        startY: 30,
        head: [['Employee', 'Dept', 'Date', 'Time', 'Status', 'Location']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
      });

      doc.save(`attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Export failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports & Trainee Leaderboard</h1>
          <p className="text-slate-400 mt-1">Export organization-wide attendance records and monitor trainee punctuality streaks</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('exports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'exports'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download size={15} />
            Data Exports
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy size={15} className="text-amber-400" />
            Trainee Leaderboard
          </button>
        </div>
      </div>

      {activeTab === 'exports' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-6 rounded-3xl shadow-xl space-y-6 h-fit">
            <div className="flex items-center gap-2 text-indigo-400 font-bold mb-4">
              <Filter size={20} />
              <h2>Report Filters</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Start Date</label>
                <input 
                  type="date" 
                  value={filters.startDate}
                  onChange={e => setFilters({...filters, startDate: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500/50" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">End Date</label>
                <input 
                  type="date" 
                  value={filters.endDate}
                  onChange={e => setFilters({...filters, endDate: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500/50" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Department</label>
                <select 
                  value={filters.department}
                  onChange={e => setFilters({...filters, department: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/50 p-10 rounded-3xl shadow-2xl flex flex-col items-center text-center">
              <div className="p-5 bg-indigo-500/10 rounded-3xl mb-6">
                <Download className="text-indigo-400" size={48} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Export Data</h3>
              <p className="text-slate-500 max-w-sm mb-10">Select your desired format to download the filtered attendance records.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                <button
                  onClick={exportToExcel}
                  disabled={loading}
                  className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white py-4 px-6 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <FileSpreadsheet size={24} />}
                  Export Excel
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={loading}
                  className="flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white py-4 px-6 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={24} />}
                  Export PDF
                </button>
              </div>
            </div>

            <div className="bg-slate-900/20 border border-dashed border-slate-800 p-8 rounded-3xl text-center">
              <p className="text-slate-600 text-sm">Automated monthly reports are sent to HR on the 1st of every month.</p>
            </div>
          </div>
        </div>
      ) : (
        <TraineeLeaderboard />
      )}
    </div>
  );
}
