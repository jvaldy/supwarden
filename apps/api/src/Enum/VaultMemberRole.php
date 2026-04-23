<?php

namespace App\Enum;

enum VaultMemberRole: string
{
    case OWNER = 'OWNER';
    case EDITOR = 'EDITOR';
    case VIEWER = 'VIEWER';
}
