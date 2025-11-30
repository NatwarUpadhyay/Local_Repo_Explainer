# cli/analyzer_cli.py
import click
import requests
import os
import time

API_URL = os.getenv("REPOINSIGHT_API_URL", "http://localhost:8000")
API_KEY = os.getenv("REPOINSIGHT_API_KEY", "your-api-key-here") # TODO: Implement real auth

@click.group()
def cli():
    """A CLI for interacting with the RepoInsight API."""
    pass

@cli.command()
def login():
    """Authenticate with the service (stub)."""
    click.echo("Authentication is not yet implemented.")
    click.echo(f"Please set REPOINSIGHT_API_KEY environment variable.")
    # TODO: Implement OAuth2 login flow to get a JWT.

@cli.command()
@click.argument('repo_url')
@click.option('--wait', is_flag=True, help="Wait for the analysis to complete.")
def submit(repo_url, wait):
    """Submit a repository for analysis."""
    click.echo(f"Submitting {repo_url} for analysis...")
    headers = {"Authorization": f"Bearer {API_KEY}"}
    payload = {"source_type": "github", "repo_url": repo_url}
    
    try:
        response = requests.post(f"{API_URL}/api/v1/jobs", json=payload, headers=headers)
        response.raise_for_status()
        job = response.json()
        job_id = job['id']
        click.echo(f"Job submitted successfully! Job ID: {job_id}")

        if wait:
            click.echo("Waiting for job to complete...")
            while True:
                status_response = requests.get(f"{API_URL}/api/v1/jobs/{job_id}", headers=headers)
                status_response.raise_for_status()
                job_status = status_response.json()['status']
                click.echo(f"Current status: {job_status}")
                if job_status in ['completed', 'failed']:
                    break
                time.sleep(5)
            click.echo("Job finished!")

    except requests.exceptions.RequestException as e:
        click.echo(f"Error submitting job: {e}", err=True)

@cli.command()
@click.argument('job_id')
def status(job_id):
    """Get the status of a job."""
    click.echo(f"Fetching status for job {job_id}...")
    headers = {"Authorization": f"Bearer {API_KEY}"}
    try:
        response = requests.get(f"{API_URL}/api/v1/jobs/{job_id}", headers=headers)
        response.raise_for_status()
        click.echo(response.json())
    except requests.exceptions.RequestException as e:
        click.echo(f"Error fetching status: {e}", err=True)

@cli.command()
@click.argument('job_id')
def download(job_id):
    """Download the graph output for a completed job."""
    click.echo(f"Downloading graph for job {job_id}...")
    headers = {"Authorization": f"Bearer {API_KEY}"}
    try:
        response = requests.get(f"{API_URL}/api/v1/jobs/{job_id}/graph", headers=headers)
        response.raise_for_status()
        # Print JSON to stdout
        click.echo(response.text)
    except requests.exceptions.RequestException as e:
        click.echo(f"Error downloading graph: {e}", err=True)

if __name__ == '__main__':
    cli()
