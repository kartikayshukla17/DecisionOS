-- ==========================================
-- VECTOR SIMILARITY SEARCH FUNCTION (RAG)
-- ==========================================

-- This function takes an embedding vector (the user's question) 
-- and finds the top `match_count` closest decisions.

CREATE OR REPLACE FUNCTION match_decisions(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_org_id uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  summary text,
  status text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    decisions.id,
    decisions.title,
    decisions.summary,
    decisions.status,
    1 - (decisions.embedding <=> query_embedding) AS similarity
  FROM decisions
  WHERE decisions.org_id = p_org_id 
    AND 1 - (decisions.embedding <=> query_embedding) > match_threshold
  ORDER BY decisions.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
