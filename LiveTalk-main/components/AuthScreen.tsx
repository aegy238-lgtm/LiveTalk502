
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, LogIn, UserPlus, Smartphone, Camera, Globe, ChevronDown } from 'lucide-react';
import { UserLevel, User as UserType } from '../types';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const ARAB_COUNTRIES = [
  "مصر", "السعودية", "الإمارات", "الكويت", "قطر", "البحرين", "عُمان", "الأردن", "فلسطين", 
  "لبنان", "سوريا", "العراق", "اليمن", "ليبيا", "السودان", "تونس", "الجزائر", "المغرب", 
  "موريتانيا", "الصومال", "جيبوتي", "جزر القمر"
];

interface AuthScreenProps {
  onAuth: (user: UserType) => void;
  appLogo?: string;
  authBackground?: string;
  canInstall?: boolean;
  onInstall?: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuth, appLogo, authBackground, canInstall, onInstall }) => {
  // تم تقليل حالة الـ Splash لتظهر المحتوى فوراً لأن هناك Splash رئيسي في App.tsx
  const [showContent, setShowContent] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [location, setLocation] = useState('مصر');
  const [avatar, setAvatar] = useState('');
  const [defaultAvatars, setDefaultAvatars] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const LOGO = appLogo || 'https://storage.googleapis.com/static.aistudio.google.com/stables/2025/03/06/f0e64906-e7e0-4a87-af9b-029e2467d302/f0e64906-e7e0-4a87-af9b-029e2467d302.png';

  useEffect(() => {
    // إظهار المحتوى فوراً لتقليل شعور التعليق
    setShowContent(true);
    
    const fetchDefaults = async () => {
       try {
         const snap = await getDoc(doc(db, 'appSettings', 'defaults'));
         if (snap.exists()) {
            const imgs = snap.data().profilePictures || [];
            setDefaultAvatars(imgs);
            if (imgs.length > 0 && !avatar) setAvatar(imgs[0]);
         }
       } catch (e) {
         console.error("Defaults fetch skipped");
       }
    };
    fetchDefaults();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatar(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && (!name || !avatar))) {
      setError('الرجاء ملء جميع الحقول واختيار صورة');
      return;
    }
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) onAuth(userDoc.data() as UserType);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userData: UserType = {
          id: userCredential.user.uid,
          customId: Math.floor(100000 + Math.random() * 899999),
          name,
          avatar,
          gender,
          location,
          level: UserLevel.NEW, coins: 5000, diamonds: 0, wealth: 0, charm: 0, isVip: false,
          stats: { likes: 0, visitors: 0, following: 0, followers: 0 }, ownedItems: []
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), { ...userData, email, createdAt: serverTimestamp() });
        onAuth(userData);
      }
    } catch (err: any) {
      setError('خطأ في البيانات أو الحساب مسجل مسبقاً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#020617] flex flex-col items-center justify-center overflow-hidden font-cairo px-4 relative">
      {authBackground && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          className="absolute inset-0 bg-cover bg-center blur-[1px]" 
          style={{ backgroundImage: `url(${authBackground})` }} 
        />
      )}
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      <AnimatePresence>
        {showContent && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-[360px] flex flex-col items-center gap-4 relative z-10"
          >
            <div className="text-center">
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl mx-auto mb-1 p-0.5 shadow-xl"
              >
                <img src={LOGO} className="w-full h-full object-cover rounded-[0.9rem]" />
              </motion.div>
              <h1 className="text-lg font-black text-white">لايف تـوك</h1>
            </div>

            <div className="w-full bg-slate-900/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6 shadow-2xl max-h-[80vh] overflow-y-auto scrollbar-hide">
              <div className="flex bg-black/40 p-1 rounded-2xl mb-6">
                <button onClick={() => setIsLogin(true)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${isLogin ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500'}`}>دخول</button>
                <button onClick={() => setIsLogin(false)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${!isLogin ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500'}`}>تسجيل جديد</button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4" dir="rtl">
                {!isLogin && (
                  <>
                    <div className="flex flex-col items-center gap-4">
                       <div className="relative group">
                          <div className="w-20 h-20 rounded-full border-2 border-amber-500/50 p-1 overflow-hidden shadow-xl bg-slate-800">
                             {avatar ? <img src={avatar} className="w-full h-full object-cover rounded-full" /> : <UserIcon size={32} className="text-slate-600 mx-auto mt-4" />}
                          </div>
                          <label className="absolute bottom-0 right-0 p-1.5 bg-amber-500 text-black rounded-full cursor-pointer shadow-lg active:scale-90 transition-transform">
                             <Camera size={14} />
                             <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                          </label>
                       </div>
                       
                       {defaultAvatars.length > 0 && (
                          <div className="w-full">
                             <p className="text-[8px] font-black text-slate-500 text-center mb-2 uppercase tracking-widest">أو اختر صورة جاهزة</p>
                             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
                                {defaultAvatars.map((img, i) => (
                                   <button key={i} type="button" onClick={() => setAvatar(img)} className={`w-10 h-10 rounded-full border-2 shrink-0 transition-all ${avatar === img ? 'border-amber-500 scale-110 shadow-lg' : 'border-white/10 opacity-50'}`}>
                                      <img src={img} className="w-full h-full object-cover rounded-full" />
                                   </button>
                                ))}
                             </div>
                          </div>
                       )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 pr-1">الاسم المستعار</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-white text-xs outline-none focus:border-amber-500/50" placeholder="اسمك الظاهر للأصدقاء..." />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 pr-1">الجنس</label>
                          <select value={gender} onChange={(e) => setGender(e.target.value as any)} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-3 text-white text-xs outline-none appearance-none cursor-pointer">
                             <option value="male">ذكر ♂</option>
                             <option value="female">أنثى ♀</option>
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 pr-1">الدولة</label>
                          <div className="relative">
                            <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-3 text-white text-xs outline-none appearance-none cursor-pointer">
                               {ARAB_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          </div>
                       </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 pr-1">البريد الإلكتروني</label>
                  <div className="relative">
                     <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-white text-xs outline-none focus:border-amber-500/50" placeholder="example@mail.com" />
                     <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 pr-1">كلمة السر</label>
                  <div className="relative">
                     <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-white text-xs outline-none focus:border-amber-500/50" placeholder="********" />
                     <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  </div>
                </div>

                {error && <p className="text-red-500 text-[10px] text-center font-black animate-pulse">{error}</p>}

                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 py-4 rounded-2xl text-black font-black text-sm shadow-xl active:scale-95 transition-all mt-4 flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : (isLogin ? <><LogIn size={18}/> دخول</> : <><UserPlus size={18}/> إنشاء الحساب</>)}
                </button>
              </form>

              {canInstall && (
                <button onClick={onInstall} className="w-full mt-6 bg-blue-600/10 border border-blue-500/20 py-3 rounded-2xl text-blue-400 font-black text-[10px] flex items-center justify-center gap-2 active:scale-95">
                  <Smartphone size={16} /> تنزيل التطبيق الرسمي
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthScreen;
