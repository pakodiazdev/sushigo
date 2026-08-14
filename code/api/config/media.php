<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Orphan Gallery Grace Period
    |--------------------------------------------------------------------------
    |
    | Number of days a MediaGallery may remain unattached (no MediaAttachment)
    | before `media:cleanup-orphans` considers it safe to delete. Keeps
    | galleries created mid-form (e.g. a "New Dish" draft) from being wiped
    | out while the user is still filling in the rest of the form.
    |
    */

    'orphan_grace_period_days' => env('MEDIA_ORPHAN_GRACE_PERIOD_DAYS', 7),

    /*
    |--------------------------------------------------------------------------
    | Upload Contexts
    |--------------------------------------------------------------------------
    |
    | Allowed MIME-derived extensions for `POST /media/upload`, per declared
    | target context, validated via Laravel's `mimes` rule. A gallery's
    | context is fixed at creation (UploadMediaRequest requires it and
    | rejects an unknown key outright) and persisted on media_galleries —
    | every later upload into that same gallery is validated against the
    | gallery's own stored context, not whatever the request claims, so a
    | context can't be swapped mid-gallery to slip past its restriction.
    |
    | Each adopter (see doc/conventions/backend/media-uploads.md) gets its
    | own key instead of one global list shared by everything a gallery
    | could ever be attached to — e.g. avatar. photos only ever render
    | through an <img>, so video makes no sense there even though Item/Dish
    | galleries intentionally allow it.
    |
    | svg is deliberately excluded from every context: SVG files can embed
    | <script> and are a stored-XSS vector when served back from the API's
    | own domain — this project has no sanitization step, so unlike raster
    | formats it isn't safe to accept as-is.
    |
    */

    'contexts' => [
        'item' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov'],
        'dish' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov'],
        'avatar' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Upload Limits
    |--------------------------------------------------------------------------
    |
    | The max file size (8000 KB, ~7.8 MB) is a literal in UploadMediaRequest,
    | not config-driven — see the comment there.
    |
    */

];
