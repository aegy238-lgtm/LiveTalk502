
import { db } from './firebase';
import { doc, updateDoc, increment, writeBatch, arrayUnion } from 'firebase/firestore';

/**
 * محرك الاقتصاد الموحد - لايف توك (V6 - المحسن للشراء الفوري)
 * يعتمد كلياً على مبدأ "التحديث المحلي أولاً، المزامنة لاحقاً"
 */

export const EconomyEngine = {
  
  // 1. صرف كوينز (هدايا، ألعاب، متجر) - تنفيذ فوري
  spendCoins: (userId: string, currentCoins: number, currentWealth: number, amount: number, currentOwnedItems: string[], itemId: string | null, updateLocalState: (data: any) => void) => {
    if (amount <= 0 || currentCoins < amount) return false;
    
    const newCoins = Number(currentCoins) - Number(amount);
    const newWealth = Number(currentWealth || 0) + Number(amount);
    
    const updateData: any = {
      coins: newCoins,
      wealth: newWealth
    };

    if (itemId && !currentOwnedItems.includes(itemId)) {
      updateData.ownedItems = [...(currentOwnedItems || []), itemId];
    }

    // تحديث الواجهة فوراً (Optimistic UI)
    updateLocalState(updateData);

    // المزامنة في الخلفية
    (async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const remoteUpdate: any = {
          coins: increment(-amount),
          wealth: increment(amount)
        };
        if (itemId) remoteUpdate.ownedItems = arrayUnion(itemId);
        await updateDoc(userRef, remoteUpdate);
      } catch (e) {
        console.error("Background Sync Error (Spend):", e);
      }
    })();

    return true;
  },

  // 2. شراء رتبة VIP - تنفيذ فوري
  buyVIP: (userId: string, currentCoins: number, currentWealth: number, vip: any, updateLocalState: (data: any) => void) => {
    if (currentCoins < vip.cost) return false;

    const newCoins = Number(currentCoins) - Number(vip.cost);
    const newWealth = Number(currentWealth || 0) + Number(vip.cost);

    const updateData = {
      isVip: true,
      vipLevel: vip.level,
      coins: newCoins,
      wealth: newWealth,
      frame: vip.frameUrl
    };

    // تحديث الواجهة فوراً
    updateLocalState(updateData);

    // المزامنة في الخلفية
    (async () => {
      try {
        await updateDoc(doc(db, 'users', userId), {
          isVip: true,
          vipLevel: vip.level,
          coins: increment(-vip.cost),
          wealth: increment(vip.cost),
          frame: vip.frameUrl
        });
      } catch (e) {
        console.error("Background Sync Error (VIP):", e);
      }
    })();

    return true;
  },

  // 3. فك الألماس وتحويله لكوينز - تنفيذ فوري
  exchangeDiamonds: (userId: string, currentCoins: number, currentDiamonds: number, amount: number, updateLocalState: (data: any) => void) => {
    if (amount <= 0 || currentDiamonds < amount) return false;
    
    const coinsGained = Math.floor(amount * 0.5);
    const newCoins = Number(currentCoins) + Number(coinsGained);
    const newDiamonds = Number(currentDiamonds) - Number(amount);
    
    // تحديث الواجهة فوراً
    updateLocalState({
      coins: newCoins,
      diamonds: newDiamonds
    });

    // المزامنة في الخلفية
    (async () => {
      try {
        await updateDoc(doc(db, 'users', userId), {
          coins: increment(coinsGained),
          diamonds: increment(-amount)
        });
      } catch (e) {
        console.error("Background Sync Error (Exchange):", e);
      }
    })();

    return true;
  },

  // 4. شحن من وكيل لمستخدم - تنفيذ فوري
  agencyTransfer: (agentId: string, currentAgentBalance: number, targetId: string, currentTargetCoins: number, currentTargetPoints: number, amount: number, updateLocalState: (agentData: any, targetData: any) => void) => {
    if (amount <= 0 || currentAgentBalance < amount) return false;

    const newAgentBalance = Number(currentAgentBalance) - Number(amount);
    const newTargetCoins = Number(currentTargetCoins) + Number(amount);
    const newTargetPoints = Number(currentTargetPoints) + Number(amount);

    // تحديث الواجهات المحلية فوراً
    updateLocalState(
      { agencyBalance: newAgentBalance },
      { coins: newTargetCoins, rechargePoints: newTargetPoints }
    );

    // المزامنة الذرية في الخلفية
    (async () => {
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', agentId), { agencyBalance: increment(-amount) });
        batch.update(doc(db, 'users', targetId), { 
          coins: increment(amount), 
          rechargePoints: increment(amount) 
        });
        await batch.commit();
      } catch (e) {
        console.error("Background Sync Error (Agency Transfer):", e);
      }
    })();

    return true;
  }
};
