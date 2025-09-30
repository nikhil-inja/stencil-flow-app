"""
Django management command to discover AI nodes using n8n-mcp
Usage: python manage.py discover_ai_nodes
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from api.services.node_discovery_service import NodeDiscoveryService
from api.models import AINodeType


class Command(BaseCommand):
    help = 'Discover AI-capable nodes using n8n-mcp and store them in the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force-refresh',
            action='store_true',
            help='Force refresh of all existing nodes',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be discovered without saving to database',
        )
        parser.add_argument(
            '--provider',
            type=str,
            help='Only discover nodes for specific provider (openai, anthropic, groq, etc.)',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Enable verbose output',
        )

    def handle(self, *args, **options):
        """Main command handler"""
        
        verbosity = 2 if options['verbose'] else 1
        self.stdout.write(
            self.style.SUCCESS('🚀 Starting AI Node Discovery using n8n-mcp')
        )
        
        # Initialize discovery service
        discovery_service = NodeDiscoveryService()
        
        try:
            if options['dry_run']:
                self._handle_dry_run(discovery_service, verbosity)
            else:
                self._handle_discovery(discovery_service, options, verbosity)
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Discovery failed: {str(e)}')
            )
            raise CommandError(f'AI node discovery failed: {str(e)}')

    def _handle_dry_run(self, discovery_service, verbosity):
        """Handle dry run mode"""
        self.stdout.write('🔍 Running in dry-run mode...')
        
        # Discover nodes without storing
        nodes = discovery_service.discover_all_ai_nodes()
        
        if not nodes:
            self.stdout.write(
                self.style.WARNING('⚠️  No AI nodes discovered')
            )
            if discovery_service.errors:
                self.stdout.write('Errors encountered:')
                for error in discovery_service.errors:
                    self.stdout.write(f'  - {error}')
            return
        
        # Display results
        self.stdout.write(f'📋 Would discover {len(nodes)} AI nodes:')
        
        providers = {}
        for node in nodes:
            provider = discovery_service._determine_provider(node)
            if provider not in providers:
                providers[provider] = []
            providers[provider].append(node['displayName'])
        
        for provider, node_names in providers.items():
            self.stdout.write(f'\n🤖 {provider.upper()} ({len(node_names)} nodes):')
            for name in sorted(node_names):
                self.stdout.write(f'  • {name}')
        
        if verbosity >= 2 and discovery_service.errors:
            self.stdout.write('\n⚠️  Errors encountered:')
            for error in discovery_service.errors:
                self.stdout.write(f'  - {error}')

    def _handle_discovery(self, discovery_service, options, verbosity):
        """Handle actual discovery and storage"""
        
        # Show current state
        current_count = AINodeType.objects.filter(is_active=True).count()
        self.stdout.write(f'📊 Current AI nodes in database: {current_count}')
        
        if options['force_refresh']:
            self.stdout.write('🔄 Force refresh enabled - will update all existing nodes')
        
        # Run discovery
        self.stdout.write('🔍 Discovering AI nodes using n8n-mcp...')
        result = discovery_service.discover_and_store_ai_nodes()
        
        if not result['success']:
            self.stdout.write(
                self.style.ERROR(f'❌ {result["message"]}')
            )
            if result.get('errors'):
                for error in result['errors']:
                    self.stdout.write(f'  - {error}')
            return
        
        # Display success results
        self.stdout.write(
            self.style.SUCCESS(f'✅ {result["message"]}')
        )
        
        self.stdout.write(f'📈 Results:')
        self.stdout.write(f'  • New nodes discovered: {result["stored"]}')
        self.stdout.write(f'  • Existing nodes updated: {result["updated"]}')
        self.stdout.write(f'  • Total nodes processed: {result["total"]}')
        
        # Show provider breakdown
        if verbosity >= 2:
            self._show_provider_breakdown()
        
        # Show any errors
        if result.get('errors'):
            self.stdout.write('\n⚠️  Warnings/Errors:')
            for error in result['errors']:
                self.stdout.write(f'  - {error}')
        
        # Final summary
        final_count = AINodeType.objects.filter(is_active=True).count()
        self.stdout.write(
            f'\n🎯 Total AI nodes in database: {final_count}'
        )

    def _show_provider_breakdown(self):
        """Show breakdown by provider"""
        self.stdout.write('\n🤖 Provider Breakdown:')
        
        providers = AINodeType.objects.filter(is_active=True).values_list(
            'provider', flat=True
        ).distinct()
        
        for provider in sorted(providers):
            count = AINodeType.objects.filter(
                is_active=True, 
                provider=provider
            ).count()
            
            nodes = AINodeType.objects.filter(
                is_active=True,
                provider=provider
            ).values_list('display_name', flat=True)
            
            self.stdout.write(f'  • {provider.upper()}: {count} nodes')
            if count <= 5:  # Show node names if not too many
                for node_name in sorted(nodes):
                    self.stdout.write(f'    - {node_name}')
            
    def _test_n8n_mcp_connection(self):
        """Test if n8n-mcp is available"""
        try:
            import subprocess
            result = subprocess.run(
                ['npx', 'n8n-mcp', '--help'], 
                capture_output=True, 
                text=True, 
                timeout=10
            )
            return result.returncode == 0
        except Exception:
            return False
