// ============================================================
// BarberQ — useShopkeeper hook
// Manages shopkeeper state, active shop, services, staff,
// working hours, breaks, closed dates, and images.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  Shop,
  Service,
  Staff,
  BusinessHour,
  BusinessBreak,
  StaffHour,
  ShopClosedDate,
  ShopImage,
} from '@/types';

export function useShopkeeper() {
  const { user } = useAuthStore();
  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [breaks, setBreaks] = useState<BusinessBreak[]>([]);
  const [staffHours, setStaffHours] = useState<StaffHour[]>([]);
  const [closedDates, setClosedDates] = useState<ShopClosedDate[]>([]);
  const [images, setImages] = useState<ShopImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all shopkeeper data
  const fetchShopData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch shop owned by user
      const { data: shopData, error: shopErr } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (shopErr) throw shopErr;

      if (!shopData) {
        setShop(null);
        setServices([]);
        setStaff([]);
        setHours([]);
        setBreaks([]);
        setStaffHours([]);
        setClosedDates([]);
        setImages([]);
        setIsLoading(false);
        return;
      }

      setShop(shopData as Shop);
      const shopId = shopData.id;

      // 2. Fetch related data in parallel
      const [
        servicesRes,
        staffRes,
        hoursRes,
        breaksRes,
        closedDatesRes,
        imagesRes,
      ] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .eq('shop_id', shopId)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),

        supabase
          .from('staff')
          .select('*, staff_services(service_id)')
          .eq('shop_id', shopId)
          .order('sort_order', { ascending: true }),

        supabase
          .from('business_hours')
          .select('*')
          .eq('shop_id', shopId)
          .order('day_of_week', { ascending: true }),

        supabase
          .from('business_breaks')
          .select('*')
          .eq('shop_id', shopId),

        supabase
          .from('shop_closed_dates')
          .select('*')
          .eq('shop_id', shopId)
          .order('closed_date', { ascending: true }),

        supabase
          .from('shop_images')
          .select('*')
          .eq('shop_id', shopId)
          .order('sort_order', { ascending: true }),
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (staffRes.error) throw staffRes.error;
      if (hoursRes.error) throw hoursRes.error;
      if (breaksRes.error) throw breaksRes.error;
      if (closedDatesRes.error) throw closedDatesRes.error;
      if (imagesRes.error) throw imagesRes.error;

      setServices((servicesRes.data ?? []) as Service[]);
      setStaff((staffRes.data ?? []) as Staff[]);
      setHours((hoursRes.data ?? []) as BusinessHour[]);
      setBreaks((breaksRes.data ?? []) as BusinessBreak[]);
      setClosedDates((closedDatesRes.data ?? []) as ShopClosedDate[]);
      setImages((imagesRes.data ?? []) as ShopImage[]);

      // 3. Fetch staff hours overrides if staff exists
      if (staffRes.data && staffRes.data.length > 0) {
        const staffIds = staffRes.data.map((s) => s.id);
        const { data: shData } = await supabase
          .from('staff_hours')
          .select('*')
          .in('staff_id', staffIds);
        setStaffHours((shData ?? []) as StaffHour[]);
      }
    } catch (err: any) {
      console.error('Error fetching shopkeeper data:', err);
      setError(err.message ?? 'Failed to load shop details');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  // ------------------------------------------------------------
  // Shop Actions
  // ------------------------------------------------------------
  const createShop = async (shopData: Partial<Shop>) => {
    if (!user) throw new Error('User not authenticated');
    setIsLoading(true);

    try {
      const newShop = {
        owner_id: user.id,
        name: shopData.name!,
        description: shopData.description ?? null,
        address: shopData.address!,
        area: shopData.area ?? null,
        city: shopData.city!,
        state: shopData.state ?? null,
        pincode: shopData.pincode ?? null,
        latitude: shopData.latitude ?? 19.0760, // Default Mumbai lat if GPS pending
        longitude: shopData.longitude ?? 72.8777,
        phone: shopData.phone ?? user.phone ?? null,
        slot_step_mins: shopData.slot_step_mins ?? 30,
        min_advance_booking_mins: shopData.min_advance_booking_mins ?? 30,
        max_advance_booking_days: shopData.max_advance_booking_days ?? 7,
        cancellation_notice_mins: shopData.cancellation_notice_mins ?? 60,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('shops')
        .insert(newShop)
        .select()
        .single();

      if (error) throw error;

      setShop(data as Shop);
      await fetchShopData();
      return data as Shop;
    } finally {
      setIsLoading(false);
    }
  };

  const updateShop = async (updates: Partial<Shop>) => {
    if (!shop) throw new Error('No active shop');

    const { error } = await supabase
      .from('shops')
      .update(updates)
      .eq('id', shop.id);

    if (error) throw error;
    setShop((prev) => (prev ? { ...prev, ...updates } : null));
  };

  // ------------------------------------------------------------
  // Service CRUD
  // ------------------------------------------------------------
  const addService = async (service: {
    name: string;
    description?: string;
    category: string;
    price: number;
    duration_mins: number;
  }) => {
    if (!shop) throw new Error('No active shop');

    const { data, error } = await supabase
      .from('services')
      .insert({
        shop_id: shop.id,
        name: service.name,
        description: service.description ?? null,
        category: service.category,
        price: service.price,
        duration_mins: service.duration_mins,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    setServices((prev) => [...prev, data as Service]);
    return data as Service;
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    const { error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const deleteService = async (id: string) => {
    // Soft delete by marking inactive or full delete
    const { error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  // ------------------------------------------------------------
  // Staff CRUD + Service Assignment
  // ------------------------------------------------------------
  const addStaff = async (member: {
    name: string;
    phone?: string;
    bio?: string;
    avatar_url?: string;
    service_ids: string[];
  }) => {
    if (!shop) throw new Error('No active shop');

    // 1. Insert staff
    const { data: staffData, error: staffErr } = await supabase
      .from('staff')
      .insert({
        shop_id: shop.id,
        name: member.name,
        phone: member.phone ?? null,
        bio: member.bio ?? null,
        avatar_url: member.avatar_url ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (staffErr) throw staffErr;

    // 2. Link services
    if (member.service_ids && member.service_ids.length > 0) {
      const junctionRows = member.service_ids.map((sId) => ({
        staff_id: staffData.id,
        service_id: sId,
      }));
      const { error: juncErr } = await supabase
        .from('staff_services')
        .insert(junctionRows);
      if (juncErr) throw juncErr;
    }

    await fetchShopData();
  };

  const updateStaff = async (
    id: string,
    updates: Partial<Staff>,
    service_ids?: string[]
  ) => {
    // 1. Update basic fields
    const { error: staffErr } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id);

    if (staffErr) throw staffErr;

    // 2. Update service links if provided
    if (service_ids !== undefined) {
      // Remove previous mappings
      await supabase.from('staff_services').delete().eq('staff_id', id);
      if (service_ids.length > 0) {
        const rows = service_ids.map((sId) => ({
          staff_id: id,
          service_id: sId,
        }));
        await supabase.from('staff_services').insert(rows);
      }
    }

    await fetchShopData();
  };

  const deleteStaff = async (id: string) => {
    const { error } = await supabase
      .from('staff')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    setStaff((prev) => prev.filter((s) => s.id !== id));
  };

  // ------------------------------------------------------------
  // Working Hours & Breaks
  // ------------------------------------------------------------
  const saveBusinessHours = async (
    newHours: { day_of_week: number; open_time: string; close_time: string; is_open: boolean }[]
  ) => {
    if (!shop) throw new Error('No active shop');

    const rows = newHours.map((h) => ({
      shop_id: shop.id,
      day_of_week: h.day_of_week,
      open_time: h.open_time,
      close_time: h.close_time,
      is_open: h.is_open,
    }));

    const { error } = await supabase
      .from('business_hours')
      .upsert(rows, { onConflict: 'shop_id,day_of_week' });

    if (error) throw error;
    await fetchShopData();
  };

  const saveBreaks = async (
    newBreaks: { day_of_week?: number | null; start_time: string; end_time: string; label: string }[]
  ) => {
    if (!shop) throw new Error('No active shop');

    // Replace breaks
    await supabase.from('business_breaks').delete().eq('shop_id', shop.id);

    if (newBreaks.length > 0) {
      const rows = newBreaks.map((b) => ({
        shop_id: shop.id,
        day_of_week: b.day_of_week ?? null,
        start_time: b.start_time,
        end_time: b.end_time,
        label: b.label || 'Break',
      }));

      const { error } = await supabase.from('business_breaks').insert(rows);
      if (error) throw error;
    }

    await fetchShopData();
  };

  // ------------------------------------------------------------
  // Staff Hours Override
  // ------------------------------------------------------------
  const saveStaffHours = async (
    staffId: string,
    sHours: { day_of_week: number; start_time: string; end_time: string; is_working: boolean }[]
  ) => {
    const rows = sHours.map((h) => ({
      staff_id: staffId,
      day_of_week: h.day_of_week,
      start_time: h.start_time,
      end_time: h.end_time,
      is_working: h.is_working,
    }));

    const { error } = await supabase
      .from('staff_hours')
      .upsert(rows, { onConflict: 'staff_id,day_of_week' });

    if (error) throw error;
    await fetchShopData();
  };

  // ------------------------------------------------------------
  // Shop Closed Dates
  // ------------------------------------------------------------
  const addClosedDate = async (closed_date: string, reason?: string) => {
    if (!shop) throw new Error('No active shop');

    const { data, error } = await supabase
      .from('shop_closed_dates')
      .insert({
        shop_id: shop.id,
        closed_date,
        reason: reason ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    setClosedDates((prev) => [...prev, data as ShopClosedDate]);
  };

  const deleteClosedDate = async (id: string) => {
    const { error } = await supabase
      .from('shop_closed_dates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setClosedDates((prev) => prev.filter((d) => d.id !== id));
  };

  // ------------------------------------------------------------
  // Image Upload to Supabase Storage & shop_images record
  // ------------------------------------------------------------
  const uploadShopImage = async (
    uri: string,
    fileName: string,
    contentType: string,
    blob: Blob,
    isCover = false
  ) => {
    if (!shop) throw new Error('No active shop');

    const filePath = `${shop.id}/${Date.now()}_${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from('shop-images')
      .upload(filePath, blob, { contentType, upsert: true });

    if (uploadErr) throw uploadErr;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('shop-images')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Save in shop_images table
    const { data: imgRecord, error: dbErr } = await supabase
      .from('shop_images')
      .insert({
        shop_id: shop.id,
        storage_path: filePath,
        url: publicUrl,
        is_cover: isCover,
        sort_order: images.length,
      })
      .select()
      .single();

    if (dbErr) throw dbErr;

    setImages((prev) => [...prev, imgRecord as ShopImage]);
    return imgRecord as ShopImage;
  };

  const deleteShopImage = async (imageId: string, storagePath: string) => {
    await supabase.storage.from('shop-images').remove([storagePath]);
    const { error } = await supabase
      .from('shop_images')
      .delete()
      .eq('id', imageId);

    if (error) throw error;
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  return {
    shop,
    services,
    staff,
    hours,
    breaks,
    staffHours,
    closedDates,
    images,
    isLoading,
    error,
    refreshShop: fetchShopData,
    createShop,
    updateShop,
    addService,
    updateService,
    deleteService,
    addStaff,
    updateStaff,
    deleteStaff,
    saveBusinessHours,
    saveBreaks,
    saveStaffHours,
    addClosedDate,
    deleteClosedDate,
    uploadShopImage,
    deleteShopImage,
  };
}
