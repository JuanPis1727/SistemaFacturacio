-- Script para obtener todos los disparadores (triggers) y sus definiciones en la base de datos
SELECT 
    t.name AS TriggerName,
    o.name AS TableName,
    t.is_instead_of_trigger AS IsInsteadOf,
    m.definition AS TriggerDefinition
FROM sys.triggers t
INNER JOIN sys.objects o ON t.parent_id = o.object_id
INNER JOIN sys.sql_modules m ON t.object_id = m.object_id
ORDER BY TableName, TriggerName;
