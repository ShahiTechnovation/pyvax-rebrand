"""Setup script for PyVax CLI — pip install -e ."""

from setuptools import setup, find_packages

setup(
    name="pyvax-cli",
    version="1.0.0",
    description="PyVax — Python to EVM transpiler for Avalanche smart contracts",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="PyVax Team",
    author_email="team@pyvax.io",
    url="https://github.com/ShahiTechnovation/pyvax-rebrand",
    license="MIT",
    packages=find_packages(exclude=["tests", "tests.*"]),
    python_requires=">=3.9",
    install_requires=[
        "typer[all]>=0.9.0",
        "rich>=13.0.0",
        "web3>=6.0.0",
        "pycryptodome>=3.15.0",
        "python-dotenv>=1.0.0",
        "cryptography>=41.0.0",
        "eth-account>=0.10.0",
        "requests>=2.28.0",
        # Project Classified deps
        "pydantic>=2.0.0",
        'tomli>=2.0.0;python_version<"3.11"',
        "tomli-w>=1.0.0",
        "anthropic>=0.30.0",
        "httpx>=0.25.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "pytest-asyncio>=0.23.0",
            "black>=23.0.0",
            "ruff>=0.1.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "pyvax=avax_cli.cli:main",
            "classified-agent=classified_agent.cli.main:main",
        ],
    },
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Environment :: Console",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Compilers",
        "Topic :: Software Development :: Code Generators",
    ],
    keywords="avalanche evm blockchain smart-contracts python transpiler web3",
)
