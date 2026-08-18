import { useState, useEffect } from 'react';
import { Search, Calendar, MapPin, Loader2, Clock, Navigation, ExternalLink, Copy, Check, Filter, X, Shield, Info, Smartphone } from 'lucide-react';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import { motion, AnimatePresence } from 'motion/react';

export default function WorkerHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/worker/history');
      setHistory(data || []);
    } catch (error) {
      console.error('Failed to fetch history', error);
      // Fallback if /worker/history endpoint has issue
      try {
        const { data: dash } = await api.get('/worker/dashboard');
        setHistory(dash.recent || []);
      } catch (err) {
        console.error('Fallback fetch failed', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyCoordinates = (coords, id) => {
    if (!coords) return;
    const text = `${coords.lat}, ${coords.lng}`;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter logic
  const filteredHistory = history.filter((record) => {
    // Search match
    const searchLower = searchTerm.toLowerCase();
    const dateMatch = record.date?.toLowerCase().includes(searchLower);
    const locationMatch = record.location?.toLowerCase().includes(searchLower);
    const coordsMatch = record.coordinates ? `${record.coordinates.lat},${record.coordinates.lng}`.includes(searchLower) : false;
    const matchesSearch = !searchTerm || dateMatch || locationMatch || coordsMatch;

    // Month match (YYYY-MM)
    const matchesMonth = !selectedMonth || record.date?.startsWith(selectedMonth);

    // Status match
    const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;

    return matchesSearch && matchesMonth && matchesStatus;
  });

  // Analytics summary
  const totalRecords = history.length;
  const completedShifts = history.filter(r => r.checkOutTime).length;
  const lateRecords = history.filter(r => r.status === 'late').length;
  const onTimeRecords = history.filter(r => r.status === 'present').length;

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedMonth('');
    setSelectedStatus('all');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Attendance & GPS History</h1>
          <p className="text-slate-400 mt-1">Detailed log of your clock-in/out timestamps and location coordinates</p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Check-Ins</span>
            <Calendar size={18} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totalRecords}</p>
          <p className="text-xs text-slate-500 mt-1">Recorded sessions</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Clocked Out</span>
            <Clock size={18} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{completedShifts}</p>
          <p className="text-xs text-slate-500 mt-1">Shifts completed</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">On-Time</span>
            <Check size={18} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{onTimeRecords}</p>
          <p className="text-xs text-slate-500 mt-1">Punctual arrivals</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Late Arrivals</span>
            <Info size={18} className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">{lateRecords}</p>
          <p className="text-xs text-slate-500 mt-1">Exceeded grace period</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by date or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Month Filter */}
          <div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="all">All Statuses</option>
              <option value="present">On Time (Present)</option>
              <option value="late">Late Arrival</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            {(searchTerm || selectedMonth || selectedStatus !== 'all') && (
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 px-3 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 transition-all"
              >
                Reset Filters
              </button>
            )}
            <div className="text-xs text-slate-400 font-medium">
              Showing <span className="text-white font-bold">{filteredHistory.length}</span> of {totalRecords}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table View (Desktop) / Cards (Mobile) */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-xl overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/60 text-slate-400 uppercase font-bold tracking-wider text-xs">
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Clock-In</th>
                <th className="px-6 py-4">Clock-Out</th>
                <th className="px-6 py-4">Office Location</th>
                <th className="px-6 py-4">GPS Coordinates</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <Loader2 className="animate-spin text-indigo-500 mx-auto" size={28} />
                    <p className="text-xs text-slate-500 mt-2">Loading attendance history...</p>
                  </td>
                </tr>
              ) : filteredHistory.map((record) => {
                const checkInCoordsStr = record.coordinates ? `${record.coordinates.lat?.toFixed(5)}, ${record.coordinates.lng?.toFixed(5)}` : null;
                const outCoordsStr = record.outCoordinates ? `${record.outCoordinates.lat?.toFixed(5)}, ${record.outCoordinates.lng?.toFixed(5)}` : null;

                return (
                  <tr key={record._id || record.date} className="hover:bg-slate-800/30 transition-colors group">
                    {/* Date */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-indigo-400 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-white">{record.date}</p>
                          <p className="text-[11px] text-slate-500">{record.distance != null ? `${record.distance}m from office` : ''}</p>
                        </div>
                      </div>
                    </td>

                    {/* Clock In */}
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        <Clock size={12} />
                        {record.checkInTime || 'N/A'}
                      </div>
                    </td>

                    {/* Clock Out */}
                    <td className="px-6 py-4">
                      {record.checkOutTime ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <Clock size={12} />
                          {record.checkOutTime}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-500 border border-slate-700">
                          Active / Shift Open
                        </span>
                      )}
                    </td>

                    {/* Location Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                        <MapPin size={15} className="text-slate-500 shrink-0" />
                        {record.location || 'Assigned Location'}
                      </div>
                    </td>

                    {/* GPS Coordinates */}
                    <td className="px-6 py-4">
                      {checkInCoordsStr ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-indigo-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                            {checkInCoordsStr}
                          </span>
                          <button
                            onClick={() => copyCoordinates(record.coordinates, record._id)}
                            title="Copy check-in coordinates"
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors"
                          >
                            {copiedId === record._id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No coordinates</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusBadge status={record.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/80 transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <Navigation size={13} className="text-indigo-400" />
                        View GPS
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredHistory.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-slate-500">
                    <MapPin size={32} className="mx-auto text-slate-700 mb-2" />
                    <p className="text-base font-bold text-slate-400">No attendance records found</p>
                    <p className="text-xs text-slate-600 mt-1">Try adjusting your date range or search filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Cards View */}
        <div className="lg:hidden divide-y divide-slate-800/50">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="animate-spin text-indigo-500 mx-auto" size={28} />
              <p className="text-xs text-slate-500 mt-2">Loading attendance history...</p>
            </div>
          ) : filteredHistory.map((record) => {
            const checkInCoordsStr = record.coordinates ? `${record.coordinates.lat?.toFixed(5)}, ${record.coordinates.lng?.toFixed(5)}` : null;

            return (
              <div key={record._id || record.date} className="p-5 space-y-4 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-400 shrink-0" />
                    <span className="text-sm font-bold text-white">{record.date}</span>
                  </div>
                  <StatusBadge status={record.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                    <p className="text-slate-500 uppercase font-bold text-[10px] tracking-wider mb-1">Clock-In</p>
                    <p className="text-sm font-bold text-indigo-300 flex items-center gap-1">
                      <Clock size={13} /> {record.checkInTime || 'N/A'}
                    </p>
                  </div>

                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                    <p className="text-slate-500 uppercase font-bold text-[10px] tracking-wider mb-1">Clock-Out</p>
                    <p className="text-sm font-bold text-amber-300 flex items-center gap-1">
                      <Clock size={13} /> {record.checkOutTime || 'Active Shift'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1 text-slate-400">
                    <MapPin size={14} className="text-slate-500" />
                    <span>{record.location || 'Office'} ({record.distance != null ? `${record.distance}m` : ''})</span>
                  </div>

                  {checkInCoordsStr && (
                    <button
                      onClick={() => setSelectedRecord(record)}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      <Navigation size={12} /> Inspect GPS
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {!loading && filteredHistory.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <MapPin size={32} className="mx-auto text-slate-700 mb-2" />
              <p className="text-base font-bold text-slate-400">No attendance records found</p>
            </div>
          )}
        </div>
      </div>

      {/* GPS Coordinates & Location Details Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Navigation size={20} className="text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">GPS Record Details</h3>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Record Summary */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Date</span>
                  <span className="font-bold text-white">{selectedRecord.date}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Assigned Office</span>
                  <span className="font-bold text-indigo-300">{selectedRecord.location || 'Office'}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Clock-In Timestamp</span>
                  <span className="font-bold text-emerald-400">{selectedRecord.checkInTime || 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Clock-Out Timestamp</span>
                  <span className="font-bold text-amber-400">{selectedRecord.checkOutTime || 'Shift Ongoing'}</span>
                </div>

                {selectedRecord.distance != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Distance to Office</span>
                    <span className="font-bold text-slate-300">{selectedRecord.distance} meters</span>
                  </div>
                )}
              </div>

              {/* Check-In Coordinates Box */}
              {selectedRecord.coordinates && (
                <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
                    <span>Clock-In Coordinates</span>
                    <button
                      onClick={() => copyCoordinates(selectedRecord.coordinates, 'modal-in')}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedId === 'modal-in' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copiedId === 'modal-in' ? 'Copied' : 'Copy'}
                    </button>
                  </p>
                  <p className="font-mono text-sm text-white font-semibold">
                    Latitude: {selectedRecord.coordinates.lat}<br />
                    Longitude: {selectedRecord.coordinates.lng}
                  </p>

                  <a
                    href={`https://maps.google.com/?q=${selectedRecord.coordinates.lat},${selectedRecord.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 pt-1"
                  >
                    Open in Google Maps <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Check-Out Coordinates Box (if present) */}
              {selectedRecord.outCoordinates && (
                <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                    <span>Clock-Out Coordinates</span>
                    <button
                      onClick={() => copyCoordinates(selectedRecord.outCoordinates, 'modal-out')}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedId === 'modal-out' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copiedId === 'modal-out' ? 'Copied' : 'Copy'}
                    </button>
                  </p>
                  <p className="font-mono text-sm text-white font-semibold">
                    Latitude: {selectedRecord.outCoordinates.lat}<br />
                    Longitude: {selectedRecord.outCoordinates.lng}
                  </p>

                  <a
                    href={`https://maps.google.com/?q=${selectedRecord.outCoordinates.lat},${selectedRecord.outCoordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 pt-1"
                  >
                    Open in Google Maps <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Device metadata */}
              {(selectedRecord.os || selectedRecord.browser) && (
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                  <Smartphone size={14} />
                  <span>Verified via {selectedRecord.browser || 'Browser'} on {selectedRecord.os || 'Device'}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-2xl text-sm font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
