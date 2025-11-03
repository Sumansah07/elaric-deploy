-- Create function to search similar screens using vector similarity
CREATE OR REPLACE FUNCTION search_similar_screens(
  query_embedding vector(768),
  match_count int DEFAULT 5
)
RETURNS TABLE (
  screen_number int,
  category text,
  analysis text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.screen_number,
    c.category,
    c.analysis,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM context_table c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
