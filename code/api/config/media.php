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
    | Upload Limits
    |--------------------------------------------------------------------------
    |
    | Allowed MIME-derived extensions for `POST /media/upload`, validated via
    | Laravel's `mimes` rule. The max file size (8000 KB, ~7.8 MB) is a
    | literal in UploadMediaRequest, not config-driven — see the comment
    | there.
    |
    | svg is deliberately excluded: SVG files can embed <script> and are a
    | stored-XSS vector when served back from the API's own domain — this
    | project has no sanitization step, so unlike raster formats it isn't
    | safe to accept as-is.
    |
    */

    'allowed_mimes' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov'],

];
