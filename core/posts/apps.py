from django.apps import AppConfig


class PostsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'posts'

    def ready(self):
        # ensure signals are registered
        from . import signals  # noqa

