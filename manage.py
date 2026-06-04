#!/usr/bin/env python3
"""Django command-line utility for Craving House."""
import os
import sys


def main():
  os.environ.setdefault("DJANGO_SETTINGS_MODULE", "craving_house.settings")
  from django.core.management import execute_from_command_line

  execute_from_command_line(sys.argv)


if __name__ == "__main__":
  main()
