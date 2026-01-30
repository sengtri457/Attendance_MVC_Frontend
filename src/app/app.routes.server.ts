import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
   {
    path: 'students/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'teachers/:id',
    renderMode: RenderMode.Client,
  },
  
    {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
