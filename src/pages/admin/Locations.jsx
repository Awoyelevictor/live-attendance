import { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Edit2, Trash2, Power, Loader2, X, AlertCircle, Navigation, Clock, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    lat: '',
    lng: '',
    radius: 100,
    clockInTime: '09:00',
    gracePeriod: 15,
    clockOutTime: '17:00'
  });
  const [submitting, setSubmitting] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [locStatus, setLocStatus] = useState({ type: '', msg: '' });

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data } = await api.get('/admin/locations');
      setLocations(data);
    } catch (error) {
      console.error('Failed to fetch locations', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (loc) => {
    setEditingId(loc._id);
    setFormData({
      name: loc.name,
      address: loc.address || '',
      lat: loc.lat,
      lng: loc.lng,
      radius: loc.radius,
      clockInTime: loc.clockInTime || '09:00',
      gracePeriod: loc.gracePeriod || 15,
      clockOutTime: loc.clockOutTime || '17:00'
    });
    setLocStatus({ type: '', msg: '' });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;
    try {
      await api.delete(`/admin/locations/${id}`);
      fetchLocations();
    } catch (error) {
      console.error('Failed to delete location', error);
    }
  };

  const handleAutoLocation = () => {
    setLocStatus({ type: '', msg: '' });
    if (!navigator.geolocation) {
      setLocStatus({ type: 'error', msg: 'Geolocation is not supported by your browser' });
      return;
    }

    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = parseFloat(position.coords.latitude.toFixed(6));
        const longitude = parseFloat(position.coords.longitude.toFixed(6));

        setFormData(prev => ({
          ...prev,
          lat: latitude,
          lng: longitude
        }));

        setLocStatus({ type: 'success', msg: `GPS position detected (${latitude}, ${longitude})` });

        // Optional reverse geocode for address
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setFormData(prev => ({
                ...prev,
                address: data.display_name,
                name: prev.name || (data.address?.office || data.address?.building || data.address?.road || 'Auto Office')
              }));
            }
          }
        } catch (e) {
          console.warn('Reverse geocode failed', e);
        } finally {
          setDetectingLoc(false);
        }
      },
      (error) => {
        setDetectingLoc(false);
        let msg = 'Failed to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please enable GPS permissions in browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location detection timed out.';
        }
        setLocStatus({ type: 'error', msg });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/admin/locations/${editingId}`, formData);
      } else {
        await api.post('/admin/locations', formData);
      }
      setModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', address: '', lat: '', lng: '', radius: 100, clockInTime: '09:00', gracePeriod: 15, clockOutTime: '17:00' });
      setLocStatus({ type: '', msg: '' });
      fetchLocations();
    } catch (error) {
      console.error('Failed to save location', error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleModal = () => {
    if (modalOpen) {
      setEditingId(null);
      setFormData({ name: '', address: '', lat: '', lng: '', radius: 100, clockInTime: '09:00', gracePeriod: 15, clockOutTime: '17:00' });
      setLocStatus({ type: '', msg: '' });
    }
    setModalOpen(!modalOpen);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Office Locations</h1>
          <p className="text-slate-400 mt-1">Manage Geofence boundaries for employee check-ins</p>
        </div>
        <button 
          onClick={toggleModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          <Plus size={20} />
          Add Location
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="lg:col-span-2 flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
        ) : locations.map((loc) => (
          <motion.div
            layout
            key={loc._id}
            className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-6 rounded-3xl shadow-xl flex items-start gap-4 group"
          >
            <div className="p-4 bg-indigo-500/10 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
              <MapPin className="text-indigo-400" size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-white truncate">{loc.name}</h3>
                <StatusBadge status={loc.status} />
              </div>
              <p className="text-sm text-slate-400 mt-1 line-clamp-1">{loc.address || 'No address provided'}</p>
              
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-800/30 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Geofence</p>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5">{loc.radius}m</p>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Clock-In</p>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5">{loc.clockInTime || '09:00'} (+{loc.gracePeriod || 15}m)</p>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Clock-Out</p>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5">{loc.clockOutTime || '17:00'}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-800/50">
                <button 
                  onClick={() => handleEdit(loc)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} /> Edit
                </button>
                <button 
                  onClick={() => handleDelete(loc._id)}
                  className="p-2 bg-slate-800 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={toggleModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Location' : 'Add New Location'}</h3>
                <button onClick={toggleModal} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                {/* Auto-location Banner */}
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      <Navigation size={16} className="text-indigo-400 animate-pulse" /> Auto-Detect GPS Coordinates
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Click to fill latitude, longitude, and address automatically using your current GPS location.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoLocation}
                    disabled={detectingLoc}
                    className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                  >
                    {detectingLoc ? <Loader2 className="animate-spin" size={14} /> : <Navigation size={14} />}
                    {detectingLoc ? 'Detecting...' : 'Auto-Locate Me'}
                  </button>
                </div>

                {locStatus.msg && (
                  <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    locStatus.type === 'error' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  }`}>
                    {locStatus.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    {locStatus.msg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-400 mb-1 block font-medium">Location Name</label>
                    <input 
                      required 
                      placeholder="e.g. Headquarters / Branch Office"
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-400 mb-1 block font-medium">Full Address</label>
                    <input 
                      placeholder="Street address, city, region"
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block font-medium">Latitude</label>
                    <input 
                      required type="number" step="any"
                      placeholder="e.g. 37.7749"
                      value={formData.lat} 
                      onChange={e => setFormData({...formData, lat: parseFloat(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block font-medium">Longitude</label>
                    <input 
                      required type="number" step="any"
                      placeholder="e.g. -122.4194"
                      value={formData.lng} 
                      onChange={e => setFormData({...formData, lng: parseFloat(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block font-medium">Geofence Radius (Meters)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 100"
                      value={formData.radius} 
                      onChange={e => setFormData({...formData, radius: parseInt(e.target.value) || 0})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block font-medium">Grace Time (Minutes)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 15"
                      value={formData.gracePeriod} 
                      onChange={e => setFormData({...formData, gracePeriod: parseInt(e.target.value) || 0})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block font-medium">Clock-In Time</label>
                    <input 
                      type="time"
                      value={formData.clockInTime} 
                      onChange={e => setFormData({...formData, clockInTime: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block font-medium">Clock-Out Time</label>
                    <input 
                      type="time"
                      value={formData.clockOutTime} 
                      onChange={e => setFormData({...formData, clockOutTime: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                    />
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 shrink-0">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2.5 text-slate-400 font-bold hover:text-white transition-all">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 min-w-[140px] justify-center">
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Save Location'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
