-- Dutch Bros Coffee (Moscow, ID). Augusto removed it for good on Nov 3, 2026 and confirmed again.
-- The Palouse scores migration already deletes this house score. Delete again so a later score cannot stick.
-- Other Moscow and Pullman places stay.

delete from public.house_scores
where place_id = 'dutch-bros-coffee';
