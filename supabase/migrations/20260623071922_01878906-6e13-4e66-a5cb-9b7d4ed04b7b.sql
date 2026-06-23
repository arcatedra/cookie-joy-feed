ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users receive own subscription updates" ON realtime.messages;
DROP POLICY IF EXISTS "public reel topics" ON realtime.messages;

CREATE POLICY "users receive own subscription updates"
ON realtime.messages
FOR SELECT
TO authenticated
USING ((SELECT realtime.topic()) = 'subscriptions:user:' || (SELECT auth.uid())::text);

CREATE POLICY "public reel topics"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING (
  (SELECT realtime.topic()) = 'reels-aggregates'
  OR (SELECT realtime.topic()) LIKE 'reel-comments-%'
);