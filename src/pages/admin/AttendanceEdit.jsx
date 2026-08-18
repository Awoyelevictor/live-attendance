import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, FileText, Loader2, Save, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

export default function AdminAttendanceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ checkInTime: '', checkOutTime: '', status: '', adminNotes: '' });

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const { data } = await api.get('/admin/attendance');
        const record = data.find(r => r._id === id);
        if (record) {
          setFormData({
            checkInTime: record.checkInTime || '',
            checkOutTime: record.checkOutTime || '',
            status: record.status,
            adminNotes: record.adminNotes || ''
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/admin/attendance/${id}`, formData);
      navigate('/admin/attendance');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all mb-4">
        <ArrowLeft size={20} /> Back to Attendance
      </button>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/50">
          <h1 className="text-2xl font-bold text-white">Edit Attendance Record</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <Clock size={16} /> Check-In Time
              </label>
              <input 
                type="time"
                value={formData.checkInTime}
                onChange={e => setFormData({...formData, checkInTime: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <Clock size={16} /> Check-Out Time
              </label>
              <input 
                type="time"
                value={formData.checkOutTime}
                onChange={e => setFormData({...formData, checkOutTime: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Attendance Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
            >
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
              <FileText size={16} /> Admin Notes
            </label>
            <textarea
              rows="4"
              value={formData.adminNotes}
              onChange={e => setFormData({...formData, adminNotes: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
              placeholder="Add internal notes about this record..."
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 text-slate-400 font-bold hover:text-white transition-all">Cancel</button>
            <button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 min-w-[160px] justify-center">
              {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
