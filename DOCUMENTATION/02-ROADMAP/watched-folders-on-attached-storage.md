# Feature note: watched folders on attached file systems

**Status:** planned (requested 2026-11-24). Not built yet.

## Goal

An administrator can define watched folders on any file system attached to the D-cubby
server: local disks, USB drives, NAS shares (SMB/NFS) and other mounted volumes. Today a
watched folder is just a typed path, and only paths inside the container are readable.

## How it works today

- The API container can only read paths mounted into it. `docker-compose.yml` mounts one
  host directory, `WATCHED_FOLDERS_PATH`, at `/watched`.
- The dam gem (0.3.1+) rejects watched-folder paths outside `Dam.config.watched_folder_roots`;
  D-cubby sets that from `WATCHED_FOLDER_ROOTS` (default `/watched` in production).
- Admins type the path by hand on Settings → Watched folders.
- **Done in v0.1.0:** `install.sh` attaches named host folders read-only at `/watched/<name>`
  (`WATCHED_MOUNTS`), and dam 0.3.2's `watched_folder_keep_originals` (on by default in
  D-cubby) imports files without deleting them, recognizing already-imported files by path.
  Scans are not recursive yet: only files directly inside the watched folder are imported.

## What to build

1. **Attach storage in the installer (`install.sh`)**
   - Let the admin attach any number of host locations, each with a short name:
     `photos=/mnt/nas/photos`, `usb=/media/usb1`. Validate that each exists and is readable.
   - Write them to `.env` and mount each read-only at `/watched/<name>` (generate a
     `docker-compose.override.yml`, since compose can't loop over a variable list).
   - `--reconfigure` adds, removes or renames attachments; `--check` verifies each mount is
     still present and readable from inside the container.
   - Document NAS shares: mount them on the host first (fstab / systemd automount) so they
     survive reboots, then attach the mount point.
2. **Show attached storage in the app**
   - Settings → System lists each attachment: name, mounted/missing, readable, free space,
     file count estimate. Read-only, like the other `.env` settings.
3. **Pick folders instead of typing paths**
   - A folder browser in the watched-folder form that starts at the attached roots and can
     only navigate inside them.
   - Needs a gem endpoint, e.g. `GET /watched_folders/browse?path=` (owners/admins only),
     that lists subdirectories within `watched_folder_roots` — never outside, symlinks
     resolved, hidden/system folders skipped.
4. **Handle storage that goes away**
   - When a root is unmounted (USB unplugged, NAS offline), scans must not treat it as
     "all files deleted". Mark the folder "unavailable", skip the scan, notify admins, and
     resume when it comes back. Check the gem's scan job for this behavior.

5. **Recursive scans** of nested archive folders (optionally mirroring folder names as tags).
6. **Ignore list:** when an imported asset is deleted and purged, keep-originals mode imports
   the file again on the next scan; remember deleted paths instead.

## Open questions

- Import or reference? Today scans copy files into D-cubby storage. Large NAS archives may
  call for an "index in place" mode that references files without copying (bigger change
  in the gem: assets without an Active Storage blob).
- Write access: keep mounts read-only (safer) unless a future feature needs to move or
  delete originals after import.
- Permissions: files on network shares may be owned by other UIDs; the container user
  (uid 1000) needs read access — document how to grant it.
