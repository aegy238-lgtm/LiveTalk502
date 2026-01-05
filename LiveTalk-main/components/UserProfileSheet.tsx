
import React, { useMemo, useEffect, useState } from 'react';
import { User, Room } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Gift, Medal, Award, Trophy, Star, MoreVertical, ShieldCheck, MicOff, UserX, ShieldAlert, RotateCcw, Heart, Users, Copy, Key, Mail, Lock, Coins } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';

interface UserProfileSheetProps {
  user: User;
  onClose: () => void;
  isCurrentUser: boolean;
  onAction: (action: string, payload?: any) => void;
  currentUser: User;
  allUsers?: User[]; 
  currentRoom: Room; 
  onShowRoomRank?: () => void;
}

const calculateLevel = (points: number) => {
  if (!points || points <= 0) return 1;
  const lvl = Math.floor(Math.sqrt(points) / 200);
  return Math.max(1, Math.min(100, lvl));
};

const LevelBadge: React.FC<{ level: number; type: 'wealth' | 'recharge' }> = ({ level, type }) => {
  const isWealth = type === 'wealth';
  return (
    <div className="relative h-7 min-w-[85px] flex items-center group cursor-default">
      <div className={`absolute inset-0 rounded-l-md rounded-r-2xl border-y border-r shadow-lg transition-all duration-300 ${
        isWealth 
          ? 'bg-gradient-to-r from-[#6a29e3] via-[#8b5cf6] to-[#6a29e3] border-[#a78bfa]/30 shadow-[#6a29e3]/20' 
          : 'bg-gradient-to-r from-[#1a1a1a] via-[#333] to-[#1a1a1a] border-amber-500/30 shadow-black/40'
      }`}>
        <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
      </div>
      <div className={`relative z-10 -ml-1 h-9 w-9 flex items-center justify-center shrink-0 drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]`}>
        <div className={`absolute inset-0 rounded-lg transform rotate-45 border-2 ${
          isWealth ? 'bg-[#5b21b6] border-[#fbbf24]' : 'bg-[#000] border-amber-500'
        }`}></div>
        <span className="relative z-20 text-lg mb-0.5">👑</span>
      </div>
      <div className="relative z-10 flex-1 pr-3 text-center">
        <span className="text-sm font-black italic tracking-tighter text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{level}</span>
      </div>
    </div>
  );
};

const UserProfileSheet: React.FC<UserProfileSheetProps> = ({ user: initialUser, onClose, isCurrentUser, onAction, currentUser, allUsers = [], currentRoom, onShowRoomRank }) => {
  const [roomContribution, setRoomContribution] = useState<number>(0);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityTab, setSecurityTab] = useState<'id' | 'email'>('id');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState(currentUser.email || '');
  const [authPass, setAuthPass] = useState('');
  
  const user = useMemo(() => {
    const latest = allUsers.find(u => u.id === initialUser.id);
    return latest || initialUser;
  }, [initialUser, allUsers]);

  const isHost = currentRoom.hostId === currentUser.id;
  const isModerator = currentRoom.moderators?.includes(currentUser.id);
  const targetIsModerator = currentRoom.moderators?.includes(user.id);
  const canManage = (isHost || isModerator) && !isCurrentUser;

  useEffect(() => {
    if (currentRoom.id && user.id) {
       const fetchContrib = async () => {
          const docRef = doc(db, 'rooms', currentRoom.id, 'contributors', user.id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
             setRoomContribution(snap.data().amount || 0);
          }
       };
       fetchContrib();
    }
  }, [currentRoom.id, user.id]);

  const handleUpdateIdPassword = async () => {
    if (newPassword.length < 6) return alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    try {
      await updateDoc(doc(db, 'users', currentUser.id), { loginPassword: newPassword });
      alert('تم ربط الحساب بكلمة مرور الـ ID بنجاح!');
      setShowSecurityModal(false);
      setNewPassword('');
    } catch (e) {
      alert('فشل تحديث البيانات');
    }
  };

  const handleUpdateEmailAuth = async () => {
    if (!newEmail.includes('@')) return alert('يرجى إدخال بريد إلكتروني صحيح');
    if (authPass.length < 6) return alert('كلمة السر يجب أن تكون 6 أحرف على الأقل');
    try {
      await updateDoc(doc(db, 'users', currentUser.id), { 
        email: newEmail,
        authPassword: authPass 
      });
      alert('تم تعيين البريد وكلمة السر بنجاح! يمكنك الآن استخدامهما للدخول المباشر.');
      setShowSecurityModal(false);
      setAuthPass('');
    } catch (e) {
      alert('فشل تحديث البيانات');
    }
  };

  const handleAdminAction = async (action: 'toggleMod' | 'kickMic' | 'kickRoom' | 'resetUserCharm' | 'breakCP' | 'breakFriend') => {
    const roomRef = doc(db, 'rooms', currentRoom.id);
    
    if (action === 'breakCP') {
      if (confirm('هل تريد إنهاء ارتباط الـ CP لهذا المستخدم؟')) {
        await updateDoc(doc(db, 'users', user.id), { cpPartner: null });
        if (user.cpPartner?.id) await updateDoc(doc(db, 'users', user.cpPartner.id), { cpPartner: null });
        alert('تم فك الارتباط بنجاح');
      }
      return;
    }

    if (action === 'breakFriend') {
      if (confirm('هل تريد إنهاء علاقة الصداقة لهذا المستخدم؟')) {
        await updateDoc(doc(db, 'users', user.id), { friendPartner: null });
        if (user.friendPartner?.id) await updateDoc(doc(db, 'users', user.friendPartner.id), { friendPartner: null });
        alert('تم إنهاء الصداقة بنجاح');
      }
      return;
    }

    if (action === 'resetUserCharm') {
      if (confirm(`هل تريد تصفير كاريزما ${user.name} على المايك؟`)) {
        onAction('resetUserCharm');
        setShowAdminMenu(false);
      }
      return;
    }

    try {
      if (action === 'toggleMod') {
        if (targetIsModerator) {
          await updateDoc(roomRef, { moderators: arrayRemove(user.id) });
        } else {
          await updateDoc(roomRef, { moderators: arrayUnion(user.id) });
        }
      } else if (action === 'kickMic') {
        const newSpeakers = (currentRoom.speakers || []).filter(s => s.id !== user.id);
        await updateDoc(roomRef, { speakers: newSpeakers });
      } else if (action === 'kickRoom') {
        if (confirm(`هل أنت متأكد من طرد ${user.name} من الغرفة؟`)) {
          const newSpeakers = (currentRoom.speakers || []).filter(s => s.id !== user.id);
          await updateDoc(roomRef, { 
            speakers: newSpeakers,
            listeners: increment(-1),
            kickedUsers: arrayUnion(user.id)
          });
          onClose();
        }
      }
      setShowAdminMenu(false);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء تنفيذ الإجراء');
    }
  };

  const wealthLvl = calculateLevel(Number(user.wealth || 0));
  const rechargeLvl = calculateLevel(Number(user.rechargePoints || 0));
  
  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center pointer-events-none p-4 overflow-hidden pb-10">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-[2px] pointer-events-auto" />

      <motion.div 
        initial={{ y: "100%", opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: "100%", opacity: 0 }} 
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-[340px] bg-[#0c101b] rounded-[2.5rem] pointer-events-auto border border-amber-500/20 shadow-[0_40px_150px_rgba(0,0,0,1)] flex flex-col max-h-[85vh]"
      >
        <div className="h-28 bg-slate-950 relative rounded-t-[2.5rem] shrink-0 overflow-visible">
          {user.cover ? <img src={user.cover} className="w-full h-full object-cover opacity-20 rounded-t-[2.5rem]" alt="" /> : <div className="w-full h-full bg-gradient-to-br from-[#1a1202] via-[#0c101b] to-[#1a1202] rounded-t-[2.5rem]"></div>}
          
          <div className="absolute top-4 left-5 z-[110] flex gap-2">
            <button onClick={onClose} className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white/70 hover:text-white border border-white/10 shadow-lg active:scale-90"><X size={16} /></button>
            {canManage && (
              <div className="relative">
                <button 
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className={`p-2 rounded-full border border-white/10 shadow-lg active:scale-90 transition-all ${showAdminMenu ? 'bg-amber-500 text-black' : 'bg-black/60 text-white/70'}`}
                >
                  <MoreVertical size={16} />
                </button>
                
                <AnimatePresence>
                  {showAdminMenu && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, x: 10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute top-10 left-0 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden"
                    >
                      {isHost && (
                        <button onClick={() => handleAdminAction('toggleMod')} className="w-full p-3 flex items-center gap-3 hover:bg-white/5 border-b border-white/5 text-right" dir="rtl">
                           <ShieldCheck size={16} className={targetIsModerator ? 'text-red-500' : 'text-emerald-500'} />
                           <span className="text-xs font-bold text-white">{targetIsModerator ? 'سحب الإشراف' : 'تعيين مشرف'}</span>
                        </button>
                      )}
                      {user.cpPartner && (
                        <button onClick={() => handleAdminAction('breakCP')} className="w-full p-3 flex items-center gap-3 hover:bg-white/5 border-b border-white/5 text-right text-pink-500" dir="rtl">
                           <Heart size={16} />
                           <span className="text-xs font-bold">فك الـ CP</span>
                        </button>
                      )}
                      {user.friendPartner && (
                        <button onClick={() => handleAdminAction('breakFriend')} className="w-full p-3 flex items-center gap-3 hover:bg-white/5 border-b border-white/5 text-right text-blue-500" dir="rtl">
                           <Users size={16} />
                           <span className="text-xs font-bold">إنهاء الصداقة</span>
                        </button>
                      )}
                      {/* Fixed: Completed truncated button and added remaining action buttons */}
                      <button onClick={() => handleAdminAction('resetUserCharm')} className="w-full p-3 flex items-center gap-3 hover:bg-white/5 border-b border-white/5 text-right" dir="rtl">
                         <RotateCcw size={16} className="text-blue-500" />
                         <span className="text-xs font-bold text-white">تصفير الكاريزما</span>
                      </button>
                      <button onClick={() => handleAdminAction('kickMic')} className="w-full p-3 flex items-center gap-3 hover:bg-white/5 border-b border-white/5 text-right" dir="rtl">
                         <MicOff size={16} className="text-orange-500" />
                         <span className="text-xs font-bold text-white">تنزيل من المايك</span>
                      </button>
                      <button onClick={() => handleAdminAction('kickRoom')} className="w-full p-3 flex items-center gap-3 hover:bg-white/5 text-right text-red-500" dir="rtl">
                         <UserX size={16} />
                         <span className="text-xs font-bold">طرد من الغرفة</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-10 space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 mb-3">
              <div className="w-full h-full rounded-full border-2 border-white/20 overflow-hidden bg-slate-900 shadow-2xl">
                <img src={user.avatar} className="w-full h-full object-cover" alt="" />
              </div>
              {user.frame && <img src={user.frame} className="absolute inset-0 scale-[1.3] pointer-events-none" alt="" />}
            </div>
            
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-white">{user.name}</h2>
              {user.badge && <img src={user.badge} className="h-4 object-contain" alt="" />}
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 text-[9px] font-black text-slate-400">
                ID: {user.customId || user.id}
              </div>
              <LevelBadge level={wealthLvl} type="wealth" />
              <LevelBadge level={rechargeLvl} type="recharge" />
            </div>

            {user.bio && (
              <p className="text-xs text-slate-400 text-center mb-6 px-4 line-clamp-3 font-medium">
                {user.bio}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 w-full mb-6">
              <div className="bg-white/5 border border-white/5 p-4 rounded-3xl text-center flex flex-col items-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">كاريزما الغرفة</span>
                <div className="flex items-center gap-1.5 text-pink-500 font-black text-lg">
                  {roomContribution.toLocaleString()}
                  <Trophy size={16} />
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-3xl text-center flex flex-col items-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">إجمالي الدعم</span>
                <div className="flex items-center gap-1.5 text-yellow-500 font-black text-lg">
                  {(Number(user.wealth || 0)).toLocaleString()}
                  <Coins size={16} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              {!isCurrentUser && (
                <>
                  <button onClick={() => { onAction('message'); onClose(); }} className="flex-1 bg-white/5 border border-white/10 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <MessageCircle size={20} />
                    دردشة
                  </button>
                  <button onClick={() => onAction('gift')} className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-pink-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <Gift size={20} />
                    إهداء
                  </button>
                </>
              )}
              {isCurrentUser && (
                <button onClick={() => { setShowSecurityModal(true); }} className="w-full bg-blue-600/20 border border-blue-500/30 text-blue-400 font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <ShieldCheck size={20} />
                  أمان الحساب والربط
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security Modal for Current User */}
      <AnimatePresence>
        {showSecurityModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-sm p-6 shadow-2xl relative">
              <button onClick={() => setShowSecurityModal(false)} className="absolute top-4 right-4 p-2 text-slate-500"><X size={20} /></button>
              
              <h3 className="text-xl font-black text-white mb-6 text-center">أمان وربط الحساب</h3>
              
              <div className="flex bg-black/40 p-1 rounded-xl mb-6">
                <button onClick={() => setSecurityTab('id')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${securityTab === 'id' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>ربط الـ ID</button>
                <button onClick={() => setSecurityTab('email')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${securityTab === 'email' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>ربط البريد</button>
              </div>

              {securityTab === 'id' ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 pr-1">كلمة مرور الـ ID الجديدة</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="6 أرقام أو حروف على الأقل" className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-500" />
                  </div>
                  <button onClick={handleUpdateIdPassword} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl active:scale-95 transition-all">تحديث كلمة مرور ID</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 pr-1">البريد الإلكتروني</label>
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 pr-1">تعيين كلمة سر الدخول</label>
                    <input type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-500" />
                  </div>
                  <button onClick={handleUpdateEmailAuth} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl active:scale-95 transition-all">ربط البريد وتفعيل الدخول</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* Fix: Added missing default export */
export default UserProfileSheet;
