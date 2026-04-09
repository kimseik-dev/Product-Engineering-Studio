-- Enable RLS
ALTER TABLE post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Post Categories Policies
DROP POLICY IF EXISTS "Allow public read access" ON post_categories;
CREATE POLICY "Allow public read access" ON post_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access" ON post_categories;
CREATE POLICY "Allow public insert access" ON post_categories FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access" ON post_categories;
CREATE POLICY "Allow public update access" ON post_categories FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete access" ON post_categories;
CREATE POLICY "Allow public delete access" ON post_categories FOR DELETE USING (true);

-- Posts Policies (혹시 몰라서 함께 추가)
DROP POLICY IF EXISTS "Allow public read access" ON posts;
CREATE POLICY "Allow public read access" ON posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access" ON posts;
CREATE POLICY "Allow public insert access" ON posts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access" ON posts;
CREATE POLICY "Allow public update access" ON posts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete access" ON posts;
CREATE POLICY "Allow public delete access" ON posts FOR DELETE USING (true);
