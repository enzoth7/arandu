# Mantenimiento manual del padrón ELEPEM

`20260813130000_drop_legacy_elepem_registry.sql` es la segunda fase destructiva
del corte. No forma parte de `supabase/migrations/` para impedir que un despliegue
normal elimine las tablas antiguas antes de verificar el respaldo.

Solo se ejecuta después de:

1. aplicar y probar `20260813120000_flatten_elepem_registry.sql`;
2. ejecutar la verificación SQL correspondiente;
3. crear el archivo trazable fuera del repositorio con el script de respaldo;
4. comprobar el SHA-256 del manifiesto;
5. crear un snapshot administrado o punto PITR completo de la base y ensayar
   su restauración en una base descartable;
6. establecer en la misma sesión los tres parámetros exigidos al comienzo del
   archivo SQL.

El archivo JSON trazable omite campos crudos no permitidos y no reemplaza un
respaldo de recuperación. El rollback SQL de la primera fase funciona mientras
las tablas antiguas sigan presentes. Después de la limpieza, la recuperación
completa se realiza desde el snapshot/PITR verificado.
