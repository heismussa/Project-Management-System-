<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->where('is_read', false)
            ->latest()
            ->get();

        return response()->json($notifications);
    }
}