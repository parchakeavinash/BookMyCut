// ============================================================
// BarberQ — useDiscovery Hook
// Fetches active shops, supports text search, city filtering,
// category filtering, and single shop details with services & staff.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Shop, Service, Staff, BusinessHour, ShopImage } from '@/types';

export interface ShopWithDetails extends Shop {
  cover_image?: string;
  min_price?: number;
  services_count?: number;
}

export function useDiscovery() {
  const [shops, setShops] = useState<ShopWithDetails[]>([]);
  const [filteredShops, setFilteredShops] = useState<ShopWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all active shops with their images and services
  const fetchShops = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Query active shops
      const { data: shopsData, error: shopsErr } = await supabase
        .from('shops')
        .select(`
          *,
          shop_images(id, url, is_cover, sort_order),
          services(id, name, category, price, duration_mins, is_active)
        `)
        .eq('is_active', true)
        .order('rating_avg', { ascending: false });

      if (shopsErr) throw shopsErr;

      const enhancedShops: ShopWithDetails[] = (shopsData ?? []).map((s: any) => {
        const coverImg = s.shop_images?.find((img: any) => img.is_cover)?.url
          || s.shop_images?.[0]?.url
          || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80';

        const activeServices = (s.services ?? []).filter((srv: any) => srv.is_active);
        const prices = activeServices.map((srv: any) => Number(srv.price)).filter((p: number) => !isNaN(p));
        const minPrice = prices.length > 0 ? Math.min(...prices) : 100;

        return {
          ...s,
          cover_image: coverImg,
          min_price: minPrice,
          services_count: activeServices.length,
        };
      });

      setShops(enhancedShops);
    } catch (err: any) {
      console.error('Discovery fetch error:', err);
      setError(err.message || 'Failed to load shops.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  // Apply filters
  useEffect(() => {
    let result = [...shops];

    // Filter by city
    if (selectedCity !== 'All') {
      result = result.filter(
        (s) => s.city.toLowerCase() === selectedCity.toLowerCase()
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      result = result.filter((s) => {
        const services = (s as any).services || [];
        return services.some(
          (srv: any) =>
            srv.is_active &&
            srv.category?.toLowerCase() === selectedCategory.toLowerCase()
        );
      });
    }

    // Filter by search query (name, area, city, service names)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) => {
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesArea = s.area?.toLowerCase().includes(q) ?? false;
        const matchesCity = s.city.toLowerCase().includes(q);
        const matchesService = ((s as any).services || []).some((srv: any) =>
          srv.name.toLowerCase().includes(q)
        );
        return matchesName || matchesArea || matchesCity || matchesService;
      });
    }

    setFilteredShops(result);
  }, [shops, searchQuery, selectedCity, selectedCategory]);

  return {
    shops: filteredShops,
    allShopsCount: shops.length,
    searchQuery,
    setSearchQuery,
    selectedCity,
    setSelectedCity,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    error,
    refreshShops: fetchShops,
  };
}

// Fetch single shop with complete details
export async function getShopDetails(shopId: string) {
  const [shopRes, servicesRes, staffRes, hoursRes, imagesRes] = await Promise.all([
    supabase.from('shops').select('*').eq('id', shopId).single(),
    supabase
      .from('services')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('price', { ascending: true }),
    supabase
      .from('staff')
      .select('*, staff_services(service_id)')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('business_hours')
      .select('*')
      .eq('shop_id', shopId)
      .order('day_of_week', { ascending: true }),
    supabase
      .from('shop_images')
      .select('*')
      .eq('shop_id', shopId)
      .order('is_cover', { ascending: false })
      .order('sort_order', { ascending: true }),
  ]);

  if (shopRes.error) throw shopRes.error;

  return {
    shop: shopRes.data as Shop,
    services: (servicesRes.data ?? []) as Service[],
    staff: (staffRes.data ?? []) as Staff[],
    hours: (hoursRes.data ?? []) as BusinessHour[],
    images: (imagesRes.data ?? []) as ShopImage[],
  };
}
