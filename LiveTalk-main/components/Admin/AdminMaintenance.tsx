import React, { useState } from 'react';
import { Eraser, AlertTriangle, Layout, Users, ShieldAlert, RotateCcw, ShieldX, UserMinus, Zap, RefreshCw, Trash2, ShieldOff, DatabaseBackup, History, CheckCircle2, Crown, Gift, ShoppingBag, Trophy, Globe, Smartphone } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, getDocs, writeBatch, doc, deleteDoc, query, where } from 'firebase/firestore';
import { DEFAULT_GIFTS, DEFAULT_STORE_ITEMS, DEFAULT_VIP_LEVELS } from '../../constants';

interface AdminMaintenanceProps {
  currentUser: any;
}

const ROOT_ADMIN_EMAIL = 'admin-owner@livetalk.com';

const AdminMaintenance: React.FC<AdminMaintenanceProps> = ({ currentUser }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');

  // استعادة البيانات الافتراضية
  const handleRestoreSystemData = async () => {
    const confirmMsg = 'هل أنت متأكد من رغبتك في استعادة كافة البيانات الافتراضية (VIP، إطارات المتجر، الهدايا)؟';
    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    setProcessStatus('جاري استعادة البيانات...');
    try {
      const batch = writeBatch(db);
      DEFAULT_VIP_LEVELS.forEach(vip => {
        const id = `vip_lvl_${vip.level}`;
        batch.set(doc(db, 'vip', id), { ...vip, id });
      });
      DEFAULT_STORE_ITEMS.forEach(item => {
        batch.set(doc(db, 'store', item.id), item);
      });
      DEFAULT_GIFTS.forEach(gift => {
        batch.set(doc(db, 'gifts', gift.id), gift);
      });
      await batch.commit();
      alert('✅ تمت استعادة كافة البيانات بنجاح!');
    } catch (e) {
      alert('❌ فشلت عملية الاستعادة.');
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  // حذف جميع المستخدمين
  const handleDeleteAllUsers = async () => {
    if (!confirm('⚠️ تحذير: حذف جميع حسابات المستخدمين؟') || !confirm('☢️ تأكيد أخير: لا يمكن التراجع!')) return;
    setIsProcessing(true);
    setProcessStatus('جاري تطهير الحسابات...');
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const batch = writeBatch(db);
      let count = 0;
      usersSnap.forEach((userDoc) => {
        const userData = userDoc.data();
        if (userDoc.id !== currentUser.id && userData.email !== ROOT_ADMIN_EMAIL) {
          batch.delete(userDoc.ref);
          count++;
        }
      });
      if (count > 0) await batch.commit();
      alert(`✅ تم حذف ${count} مستخدم بنجاح.`);
    } catch (e) { alert('❌ فشل الحذف الشامل.'); } finally { setIsProcessing(false); setProcessStatus(''); }
  };

  // فك حظر جميع الأجهزة والشبكات (القائمة السوداء فقط)
  const handleClearBlacklist = async () => {
    if (!confirm('🔥 هل تريد حذف جميع بنود حظر الأجهزة والشبكات (فك بند الشبكة عن الكل)؟ سيتمكن الجميع من الوصول لشاشة الدخول مجدداً.')) return;
    
    setIsProcessing(true);
    setProcessStatus('جاري فك حظر الجميع...');
    try {
      const blacklistSnap = await getDocs(collection(db, 'blacklist'));
      const batch = writeBatch(db);
      let count = 0;
      blacklistSnap.forEach((d) => {
        batch.delete(d.ref);
        count++;
      });
      if (count > 0) await batch.commit();
      alert(`✅ تم فك الحظر عن ${count} جهاز/شبكة بنجاح!`);
    } catch (e) { alert('❌ فشلت العملية.'); } finally { setIsProcessing(false); setProcessStatus(''); }
  };

  const handleWipeAllCharisma = async () => {
    if (!confirm('🔥 هل أنت متأكد من تصفير كافة بيانات الكاريزما والدعم؟')) return;
    setIsProcessing(true);
    setProcessStatus('جاري تصفير الكاريزما...');
    try {
      const batch = writeBatch(db);
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(uDoc => { batch.update(uDoc.ref, { charm: 0, hostProduction: 0 }); });
      const roomsSnap = await getDocs(collection(db, 'rooms'));
      for (const roomDoc of roomsSnap.docs) {
        const contribSnap = await getDocs(collection(db, 'rooms', roomDoc.id, 'contributors'));
        contribSnap.forEach(cDoc => { batch.delete(cDoc.ref); });
        batch.update(roomDoc.ref, { sessionCoins: 0 });
      }
      await batch.commit();
      alert('✅ تم تصفير الكاريزما بنجاح!');
    } catch (e) { alert('❌ فشلت عملية التصفير.'); } finally { setIsProcessing(false); setProcessStatus(''); }
  };

  const handleClearChat = async () => {
    if (!confirm('حذف الأرشيف الخاص؟')) return;
    setIsProcessing(true);
    try {
      const snap = await getDocs(collection(db, 'private_chats'));
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      alert('تم تنظيف المحادثات بنجاح');
    } catch (e) { alert('فشل التنظيف'); } finally { setIsProcessing(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 text-right font-cairo" dir="rtl">
      <div className="bg-indigo-600/10 border-2 border-indigo-500/30 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-right">
            <h3 className="text-2xl font-black text-white flex items-center justify-center md:justify-start gap-3">
              <DatabaseBackup className="text-indigo-400" size={32} /> إدارة بيانات النظام
            </h3>
            <p className="text-slate-400 text-sm font-bold mt-2">استرجع رتب الـ VIP، الهدايا الأساسية، وإطارات المتجر.</p>
          </div>
          <button onClick={handleRestoreSystemData} disabled={isProcessing} className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3">
            {isProcessing ? <RefreshCw className="animate-spin" /> : <RotateCcw />} استعادة VIP والإطارات
          </button>
        </div>
      </div>

      <div className="bg-red-600/10 border-2 border-red-600/30 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-black text-white flex items-center gap-3 mb-6">
            <ShieldAlert className="text-red-500" /> منطقة العمليات الخطرة
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={handleClearBlacklist} disabled={isProcessing} className="px-8 py-5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
              <Globe size={20} /> فك حظر (الشبكة والأجهزة) عن الجميع
            </button>

            <button onClick={handleDeleteAllUsers} disabled={isProcessing} className="px-8 py-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
              <UserMinus size={20} /> حذف جميع المستخدمين
            </button>

            <button onClick={handleWipeAllCharisma} disabled={isProcessing} className="px-8 py-5 bg-orange-700 hover:bg-orange-800 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
              <Trophy size={20} /> تصفير كاريزما التطبيق
            </button>
            
            <button onClick={handleClearChat} disabled={isProcessing} className="px-8 py-5 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
              <History size={20} /> مسح الأرشيف الخاص
            </button>
          </div>
        </div>
        
        {isProcessing && (
          <div className="mt-6 flex items-center justify-center gap-3 text-amber-500 font-black animate-pulse bg-black/40 py-2 rounded-xl">
             <RefreshCw className="animate-spin" size={16} />
             <span className="text-xs">{processStatus || 'جاري المعالجة...'}</span>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl opacity-50 flex items-center gap-3">
         <ShieldOff className="text-slate-500" />
         <p className="text-[10px] text-slate-500 font-bold">ملاحظة: حساب الأدمن الرئيسي ({ROOT_ADMIN_EMAIL}) محمي برمجياً.</p>
      </div>
    </div>
  );
};

export default AdminMaintenance;