-- ================================================================
-- BarberQ — Migration 008: Shopkeeper Setup, RLS Fix & Storage
-- ================================================================

-- 1. Fix shops_insert RLS policy so shopkeepers registered in users table can insert
DROP POLICY IF EXISTS "shops_insert" ON shops;

CREATE POLICY "shops_insert"
    ON shops FOR INSERT
    WITH CHECK (
        auth.uid() = owner_id
        AND (
            (SELECT role FROM users WHERE id = auth.uid()) = 'shopkeeper'
            OR (auth.jwt() ->> 'role') = 'shopkeeper'
        )
    );

-- 2. Ensure Storage bucket 'shop-images' exists for shop photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public can view shop images
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'shop_images_public_read'
    ) THEN
        CREATE POLICY "shop_images_public_read"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'shop-images');
    END IF;
END $$;

-- Storage RLS: Authenticated users can upload shop images
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'shop_images_authenticated_upload'
    ) THEN
        CREATE POLICY "shop_images_authenticated_upload"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'shop-images'
                AND auth.role() = 'authenticated'
            );
    END IF;
END $$;

-- Storage RLS: Users can update/delete their own uploads
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'shop_images_owner_manage'
    ) THEN
        CREATE POLICY "shop_images_owner_manage"
            ON storage.objects FOR ALL
            USING (
                bucket_id = 'shop-images'
                AND auth.role() = 'authenticated'
            );
    END IF;
END $$;

-- 3. Helper function: check if a user is shop owner
CREATE OR REPLACE FUNCTION is_shop_owner(p_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM shops
        WHERE id = p_shop_id AND owner_id = auth.uid()
    );
$$;
