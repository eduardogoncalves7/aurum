UPDATE catalog_items
SET foto = regexp_replace(foto, '\.jpg$', '.webp'),
    atualizado_em = now()
WHERE foto LIKE '/images/services/%.jpg';

UPDATE catalog_items
SET service_data = jsonb_set(
      service_data,
      '{image}',
      to_jsonb(regexp_replace(service_data->>'image', '\.jpg$', '.webp')),
      true
    ),
    atualizado_em = now()
WHERE service_data->>'image' LIKE '/images/services/%.jpg';

UPDATE catalog_items
SET service_data = jsonb_set(
      service_data,
      '{photos}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN photo.value #>> '{}' LIKE '/images/services/%.jpg'
              THEN to_jsonb(regexp_replace(photo.value #>> '{}', '\.jpg$', '.webp'))
            ELSE photo.value
          END
          ORDER BY photo.ordinality
        )
        FROM jsonb_array_elements(service_data->'photos') WITH ORDINALITY AS photo(value, ordinality)
      ),
      true
    ),
    atualizado_em = now()
WHERE jsonb_typeof(service_data->'photos') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(service_data->'photos') AS photo(value)
    WHERE photo.value #>> '{}' LIKE '/images/services/%.jpg'
  );

UPDATE catalog_items
SET fotos = ARRAY(
      SELECT regexp_replace(photo.value, '\.jpg$', '.webp')
      FROM unnest(fotos) WITH ORDINALITY AS photo(value, ordinality)
      ORDER BY photo.ordinality
    ),
    atualizado_em = now()
WHERE EXISTS (
  SELECT 1
  FROM unnest(fotos) AS photo(value)
  WHERE photo.value LIKE '/images/services/%.jpg'
);
